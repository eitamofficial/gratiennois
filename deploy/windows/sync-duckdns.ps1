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
#
# ## Utilisation
#
# Renseigner le jeton une fois, puis exécuter :
#
#     .\deploy\windows\sync-duckdns.ps1 -Domaine wiki-gratiennois.duckdns.org -Jeton "votre-jeton"
#
# Pour une surveillance continue, le planificateur de tâches l'exécute toutes
# les dix minutes (voir README). Un tour par dix minutes suffit largement : le
# préfixe de l'opérateur ne change pas au milieu d'une soirée.
#
# ## Pourquoi le jeton est passé en argument
#
# La tâche planifiée tourne sous le compte SYSTEM (voir installer-services.ps1).
# Un `setx DUCKDNS_TOKEN "..."` écrit dans l'environnement de *votre* session :
# SYSTEM ne le lit pas, et la tâche échouerait systématiquement sur
# « DUCKDNS_TOKEN est obligatoire » sans rienlogger d'utile. Le jeton est donc
# inscrit dans la commande de la tâche, lisible des seuls administrateurs — le
# même cercle que celui qui peut déjà lire le fichier .env du projet.
#
# Pour une exécution manuelle, l'environnement reste pris en compte : les
# valeurs ci-dessous ne servent que de repli.

param(
  [string]$Domaine = $(if ($env:WIKI_DOMAINE) { $env:WIKI_DOMAINE } else { [Environment]::GetEnvironmentVariable("WIKI_DOMAINE", "Machine") }),
  [string]$Jeton = $(if ($env:DUCKDNS_TOKEN) { $env:DUCKDNS_TOKEN } else { [Environment]::GetEnvironmentVariable("DUCKDNS_TOKEN", "Machine") }),
  [string]$Memoire = "$PSScriptRoot\duckdns-ipv6.txt"
)

$ErrorActionPreference = "Stop"

if (-not $Domaine) { throw "WIKI_DOMAINE est obligatoire (le sous-domaine DuckDNS)." }
if (-not $Jeton)   { throw "DUCKDNS_TOKEN est obligatoire (voir https://www.duckdns.org)." }

# --- L'adresse IPv6 stable ---------------------------------------------------
#
# On retient l'adresse annoncée par la box (PrefixOrigin = RouterAdvertisement)
# dont le suffixe vient de la carte réseau (SuffixOrigin = Link). C'est celle
# qui survit aux redémarrages et aux reconnexions.
#
# `TempAddressPreference` vaut « Preferred » quand Windows préfère l'adresse
# confidentielle, et « Disabled » quand on a désactivé cette préférence. Dans
# le premier cas, on écarte l'adresse `Random` malgré tout.
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

$adresse = $stable.IPAddress

# --- Faut-il appeler DuckDNS ? ----------------------------------------------
#
# Inutile d'appeler l'API quand rien n'a bougé : elle compte les requêtes, et
# un appel par quart d'heure « pour rien » reste du bruit.
$connue = $null
if (Test-Path $Memoire) {
  $connue = (Get-Content $Memoire -Raw -ErrorAction SilentlyContinue).Trim()
}

if ($connue -eq $adresse) {
  Write-Host "IPv6 inchangee : $adresse"
  exit 0
}

Write-Host "IPv6 : $connue  ->  $adresse"

# --- Mise a jour -------------------------------------------------------------
#
# `ip=` vide demande a DuckDNS de detecter l'adresse IPv4 lui-meme : on ne la
# controle pas (celle de la box), et laissons faire. `ipv6=` fixe notre adresse
# stable. Le parametre `verbose=false` evite d'inscrire un message en clair
# dans la reponse, que l'on journalise ensuite.
$url = "https://www.duckdns.org/update?domains=$Domaine&token=$Jeton&ipv6=$adresse&ip=&verbose=false"

try {
  $reponse = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30).Content.Trim()
} catch {
  throw "DuckDNS est injoignable : $($_.Exception.Message)"
}

# Un jeton expire ne provoque pas d'erreur HTTP : la reponse est simplement
# « KO ». Sans ce test, on croireait avoir reussi.
if ($reponse -ne "OK") {
  throw "DuckDNS a refuse la mise a jour : '$reponse' (jeton expire ?)"
}

New-Item -ItemType Directory -Force -Path (Split-Path $Memoire) | Out-Null
Set-Content -Path $Memoire -Value $adresse -Encoding ascii

Write-Host "DuckDNS a jour pour ${Domaine}.duckdns.org -> $adresse"
