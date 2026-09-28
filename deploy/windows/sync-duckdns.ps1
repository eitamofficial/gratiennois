# Recale l'enregistrement DuckDNS sur l'adresse IPv6 stable du PC.
#
# ## Pourquoi ce script existe
#
# Une machine connectée en IPv6 reçoit deux adresses publiques :
#
#   - l'une dérivée de sa carte réseau (`SuffixOrigin: Link`) — **stable** ;
#   - l'autre tirée au sort pour protéger la vie privée
#     (`SuffixOrigin: Random`) — elle **change** régulièrement.
#
# DuckDNS enregistre celle qu'il trouve. Si c'est la seconde, le nom pointe
# vers une adresse abandonnée : le site devient injoignable sans que rien ne
# semble cassé, et le retour à la normale dépend d'une rotation aléatoire.
#
# Ce script choisit donc explicitement l'adresse stable, et ne signale à
# DuckDNS que lorsqu'elle a changé.
## ## Utilisation
#
# Renseigner le jeton une fois, puis exécuter :
#
#     .\deploy\windows\sync-duckdns.ps1 -Domaine wiki-gratiennois -Jeton "votre-jeton"
#
# Pour une surveillance continue, le planificateur de tâches l'exécute toutes
# les dix minutes (voir README). Un tour par dix minutes suffit largement : le
# préfixe de l'opérateur ne change pas au milieu d'une soirée.
#
# ## Deux noms pour deux choses
#
# `$Domaine` est le **sous-domaine seul** (`wiki-gratiennois`), pas le nom
# complet : l'API attend `domains=wiki-gratiennois` et refuserait
# `wiki-gratiennois.duckdns.org`. C'est aussi ce que Caddy reçoit en
# `WIKI_DOMAINE`, et qui doit lui être complet (`wiki-gratiennois.duckdns.org`)
# pour répondre aux requêtes. D'où la variable distincte `WIKI_SOUS_DOMAINE`
# pour celle-ci, alors que le Caddyfile lit `WIKI_DOMAINE`.
#
# Les confondre est le plus sûr moyen d'obtenir soit un refus de DuckDNS, soit
# un Caddy qui renvoie une page vide.
#
# ## Pourquoi le jeton est passé en argument
#
# La tâche planifiée tourne sous le compte SYSTEM (voir installer-services.ps1).
# Un `setx DUCKDNS_TOKEN "..."` écrit dans l'environnement de *votre* session :
# SYSTEM ne le lit pas, et la tâche échouerait systématiquement sur
# « DUCKDNS_TOKEN est obligatoire » sans rien logger d'utile. Le jeton est donc
# inscrit dans la commande de la tâche, lisible des seuls administrateurs — le
# même cercle que celui qui peut déjà lire le fichier .env du projet.
#
# Pour une exécution manuelle, l'environnement reste pris en compte : les
# valeurs ci-dessous ne servent que de repli.

param(
  [string]$Domaine = $(if ($env:WIKI_SOUS_DOMAINE) { $env:WIKI_SOUS_DOMAINE }
                      elseif ([Environment]::GetEnvironmentVariable("WIKI_SOUS_DOMAINE", "Machine")) { [Environment]::GetEnvironmentVariable("WIKI_SOUS_DOMAINE", "Machine") }
                      else { "wiki-gratiennois" }),
  [string]$Jeton = $(if ($env:DUCKDNS_TOKEN) { $env:DUCKDNS_TOKEN }
                     else { [Environment]::GetEnvironmentVariable("DUCKDNS_TOKEN", "Machine") }),
  [string]$Memoire = "$PSScriptRoot\duckdns-ipv6.txt",
  [switch]$PublierIpv6
)

$ErrorActionPreference = "Stop"

if (-not $Domaine) { throw "WIKI_DOMAINE est obligatoire (le sous-domaine DuckDNS)." }
if (-not $Jeton)   { throw "DUCKDNS_TOKEN est obligatoire (voir https://www.duckdns.org)." }

# --- L'adresse IPv6 stable ---------------------------------------------------
#
# Ce bloc n'est utile qu'avec `-PublierIpv6`. Par defaut on ne publie QUE
# l'IPv4, et le script demande a DuckDNS de retirer l'enregistrement `AAAA`.
# Raison : la redirection de port fonctionne, et l'IPv4 a ete verifie depuis
# plusieurs points dans le monde ; mais un telephone en 4G prefere l'IPv6 et
# n'atteignait pas le site. Sans `AAAA`, il n'a plus d'autre chemin que
# l'IPv4. Republier l'IPv6 n'a de sens que si le reseau mobile la rendait
# injoignable - auquel cas c'est ce chemin-la qu'il faut reparer.
#
# On retient l'adresse annoncée par la box (PrefixOrigin = RouterAdvertisement)
# dont le suffixe vient de la carte réseau (SuffixOrigin = Link). C'est celle
# qui survit aux redémarrages et aux reconnexions.
#
# `TempAddressPreference` vaut « Preferred » quand Windows préfère l'adresse
# confidentielle, et « Disabled » quand on a désactivé cette préférence. Dans
# le premier cas, on écarte l'adresse `Random` malgré tout.
$stable = $null
if ($PublierIpv6) {
  $stable = Get-NetIPAddress -AddressFamily IPv6 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.PrefixOrigin -eq "RouterAdvertisement" -and
      $_.SuffixOrigin -eq "Link" -and
      $_.AddressState -eq "Preferred" -and
      $_.IPAddress -notlike "fe80:*"
    } |
    Select-Object -First 1

  if (-not $stable) {
    throw "Aucune adresse IPv6 stable trouvee. Le PC est-il connecte en IPv6 ?"
  }
}

# Ce que l'on veut retrouver dans l'etat enregistre. La valeur sert de temoin :
# tant qu'elle ne change pas, l'API n'est pas rappelee.
$signature = if ($PublierIpv6) { $stable.IPAddress } else { "ipv4-seule" }

# --- Faut-il appeler DuckDNS ? ----------------------------------------------
#
# Inutile d'appeler l'API quand rien n'a bougé : elle compte les requêtes, et
# un appel par quart d'heure « pour rien » reste du bruit.
$connue = $null
if (Test-Path $Memoire) {
  $connue = (Get-Content $Memoire -Raw -ErrorAction SilentlyContinue).Trim()
}

if ($connue -eq $signature) {
  Write-Host "Deja a jour : $signature"
  exit 0
}

Write-Host "Etat : $connue  ->  $signature"

# --- Mise a jour -------------------------------------------------------------
#
# `ip=` vide demande a DuckDNS de detecter l'adresse IPv4 lui-meme : on ne la
# controle pas (celle de la box), et laissons faire. Le parametre `verbose=false`
# evite d'inscrire un message en clair dans la reponse, que l'on journalise
# ensuite.
#
# Deux formes selon le mode. `ipv6=` epingle l'adresse de la machine ; laisse
# vide, il retire l'enregistrement AAAA, pour que les visiteurs n'aient plus que
# le chemin IPv4 a emprunter.
#
# NE PAS utiliser `clear=true` pour cela : chez DuckDNS, il efface l'IPv4 ET
# l'IPv6, et le domaine cesse d'exister - le site devient injoignable pour
# tout le monde, pas seulement pour les telephones. C'etait le defaut, ici.
# `ipv6=none` est refuse par l'API ; seule la valeur vide convient.
if ($PublierIpv6) {
  $url = "https://www.duckdns.org/update?domains=$Domaine&token=$Jeton&ipv6=$($stable.IPAddress)&ip=&verbose=false"
} else {
  $url = "https://www.duckdns.org/update?domains=$Domaine&token=$Jeton&ipv6=&ip=&verbose=false"
}

try {
  $contenu = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30).Content
} catch {
  throw "DuckDNS est injoignable : $($_.Exception.Message)"
}

# PowerShell 5.1 - celui de Windows 11, celui qu'execute la tache planifiee -
# renvoie `Content` sous forme d'octets des que le type MIME n'est pas du texte
# simple. `.Trim()` n'existe pas sur un tableau d'octets : le script echouait
# apres avoir bien parle a DuckDNS, en annonçant a tort un reseau injoignable.
# La conversion est donc explicite, et le message d'erreur ne parle plus que du
# reseau quand c'est reellement le reseau qui a echoue.
if ($contenu -is [byte[]]) { $reponse = [Text.Encoding]::UTF8.GetString($contenu).Trim() }
else { $reponse = ([string]$contenu).Trim() }

# DuckDNS ne repond jamais par un seul mot, meme avec `verbose=false`. Sur un
# succes, la reponse tient en trois lignes :
#
#     OK
#     2a01:cb1d:...:4d90
#     NOCHANGE
#
# Comparer la reponse entiere a "OK" rejetait donc chaque succes, et le script
# echouait toutes les dix minutes alors que tout allait bien. Seul le verdict -
# la premiere ligne - distingue une reussite d'un refus.
# `@(...)` n'est pas decoratif. Un refus de DuckDNS tient sur une seule ligne,
# et PowerShell reduit alors le resultat du pipeline a une chaine scalaire :
# `$lignes[0]` indexerait un *caractere*, et le verdict deviendrait "K" au lieu
# de "KO" - donc jamais egal a "OK", et impossible a diagnostiquer ensuite.
$lignes = @(($reponse -split "\r?\n") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$verdict = $lignes[0]

# Un jeton expire ne provoque aucune erreur HTTP : la reponse est simplement
# « KO ». Sans ce test, on en déduirait à tort que l'adresse est à jour.
if ($verdict -ne "OK") {
  throw "DuckDNS a refuse la mise a jour : '$verdict' (jeton expire ?)"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Memoire) | Out-Null
Set-Content -Path $Memoire -Value $signature -Encoding ascii

# « NOCHANGE » signifie que DuckDNS portait deja cet etat : c'est un succes, et
# meme le cas le plus frequent en exploitation normale.
if ($lignes -contains "NOCHANGE") {
  Write-Host "DuckDNS inchange pour ${Domaine}.duckdns.org"
} else {
  if ($PublierIpv6) {
    Write-Host "DuckDNS a jour pour ${Domaine}.duckdns.org -> $($stable.IPAddress) (IPv4 + IPv6)"
  } else {
    Write-Host "DuckDNS a jour pour ${Domaine}.duckdns.org (IPv4 seule, AAAA retire)"
  }
}
