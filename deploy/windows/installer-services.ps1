# Installe les services du wiki dans le Planificateur de taches.
#
# Trois taches, parce que les trois rôles ont des rythmes différents :
#
#   Wiki Gratienois  — le wiki, au démarrage, relancé s'il tombe
#   Wiki Caddy       — le reverse proxy, au démarrage
#   Wiki DuckDNS     — l'adresse IPv6, toutes les 10 minutes
#
# Ce n'est pas « termux-services pour Windows » : le Planificateur ne relance
# pas un script qui a rendu la main, et c'est `demarrer-wiki.bat` qui s'en
# charge lui-même. Le Planificateur apporte le démarrage au boot, les privilèges
# élevés, et la reprise après un plantage du script lui-même.
#
# ## Utilisation
#
# Dans une fenêtre PowerShell **en administrateur**, depuis la racine du projet :
#
#     powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -JetonDuckDNS "votre-jeton"
#
# Le jeton DuckDNS est facultatif : sans lui, la tâche est quand même créée mais
# échouera à chaque tour. Il peut aussi être lu dans `$env:DUCKDNS_TOKEN` si
# vous l'avez défini avant.
#
# Pour retirer :
#
#     powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -Desinstaller

param(
  [switch]$Desinstaller,
  [string]$JetonDuckDNS = $env:DUCKDNS_TOKEN,
  [string]$SousDomaine = $(if ($env:WIKI_SOUS_DOMAINE) { $env:WIKI_SOUS_DOMAINE } else { "wiki-gratiennois" })
)

$ErrorActionPreference = "Stop"

$racine = (Resolve-Path "$PSScriptRoot\..\..").Path
$fenetre = "$PSScriptRoot"

function Taches {
  "Wiki Gratienois", "Wiki Caddy", "Wiki DuckDNS"
}

# `schtasks /Delete` signale sur stderr qu'il n'a rien trouvé, et
# `$ErrorActionPreference = "Stop"` transforme toute sortie d'erreur d'un
# programme natif en exception. Sans ce garde-fou, l'installeur s'arrete sur la
# toute première tâche absente — donc systématiquement, à la première
# installation, avant d'avoir rien créé. Le bruit est attendu : seul le code de
# sortie compte.
function Supprimer-Tache {
  param([string]$Nom)

  $precedent = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  schtasks /Delete /TN $Nom /F 2>&1 | Out-Null
  $supprimee = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $precedent
  return $supprimee
}

# --- Desinstallation --------------------------------------------------------
if ($Desinstaller) {
  foreach ($t in Taches) {
    if (Supprimer-Tache $t) { Write-Host "Supprimee : $t" }
  }
  Write-Host "Termine."
  exit 0
}

# --- Droits administrateur --------------------------------------------------
$estAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
  ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $estAdmin) {
  throw "Ouvrez PowerShell en administrateur : le port 80 l'exige, et les taches doivent s'executer avec les memes privileges."
}

# Le jeton est ecrit tel quel dans la ligne de commande de la tache, entre
# guillemets. Un guillemet dedans la tronquerait, et l'echec serait invisible
# jusqu'a la premiere execution, dix minutes plus tard. On le refuse ici.
if ($JetonDuckDNS -and $JetonDuckDNS.Contains('"')) {
  throw "Le jeton DuckDNS contient un guillemet, ce qui casserait la commande de la tache. Copiez-le depuis duckdns.org sans guillemets."
}

Write-Host "Racine du projet : $racine"
Write-Host ""

# --- Nettoyage --------------------------------------------------------------
# On repart d'une installation propre : une tache existante avec des reglages
# de l'ancienne version serait conservee telle quelle par /Create, qui echoue
# silencieusement si le nom est deja pris.
foreach ($t in Taches) { Supprimer-Tache $t | Out-Null }

# --- Taches ----------------------------------------------------------------
function Creer {
  param($Nom, $Commande, $RepeterMinutes)

  $arguments = @("/Create", "/TN", $Nom, "/TR", $Commande, "/RU", "SYSTEM", "/RL", "HIGHEST", "/F")
  if ($RepeterMinutes) { $arguments += @("/SC", "MINUTE", "/MO", $RepeterMinutes) }
  else                 { $arguments += @("/SC", "ONSTART") }

  $precedent = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $sortie = & schtasks @arguments 2>&1
  $code = $LASTEXITCODE
  $ErrorActionPreference = $precedent

  if ($code -ne 0) {
    # Le message de schtasks est en anglais et volumineux : on le donne tel
    # quel, plutot qu'un « echec » qui ne dirait rien. C'est presque toujours
    # un nom de tache deja pris, ou un guillemet dans /TR.
    throw "Echec de la creation de la tache '$Nom' :`n$($sortie -join "`n")"
  }
  Write-Host "  creee : $Nom"
}

Write-Host "Installation des taches..."

# SYSTEM et non l'utilisateur courant : une tache qui s'exécute sous un compte
# precis n'a pas d'acces au PATH de l'utilisateur, et le script echouerait
# sur une erreur incomprehensible (« node n'est pas reconnu »).
Creer -Nom "Wiki Gratienois" `
  -Commande "`"$fenetre\demarrer-wiki.bat`""

Creer -Nom "Wiki Caddy" `
  -Commande "`"$fenetre\demarrer-caddy.bat`""

Creer -Nom "Wiki DuckDNS" `
  -Commande ("powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$fenetre\sync-duckdns.ps1`" -Domaine `"$SousDomaine`"" + $(if ($JetonDuckDNS) { " -Jeton `"$JetonDuckDNS`"" } else { "" })) `
  -RepeterMinutes 10

# --- Pare-feu ---------------------------------------------------------------
# Caddy ecoute le port 80 mais Windows le bloque par defaut. Sans cette regle,
# le site est injoignable depuis le reste du reseau, alors que tout semble
# fonctionner en local : le piege le plus deroutant de cette installation.
foreach ($port in 80, 443) {
  $nom = "Wiki Caddy TCP $port"
  if (Get-NetFirewallRule -DisplayName $nom -ErrorAction SilentlyContinue) {
    Remove-NetFirewallRule -DisplayName $nom
  }
  New-NetFirewallRule -DisplayName $nom -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
  Write-Host "  pare-feu : port $port ouvert"
}

Write-Host ""
Write-Host "Termine. Pour demarrer immediatement :"
Write-Host "    Start-ScheduledTask -TaskName 'Wiki Gratienois'"
Write-Host "    Start-ScheduledTask -TaskName 'Wiki Caddy'"
Write-Host ""
if ($JetonDuckDNS) {
  Write-Host "Tache DuckDNS : jeton inscrit pour $SousDomaine."
} else {
  Write-Host "[A FAIRE] La tache DuckDNS n'a pas de jeton : elle echouera a chaque tour."
  Write-Host "Relancez l'installeur avec :"
  Write-Host '    powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -JetonDuckDNS "votre-jeton"'
}
Write-Host ""
Write-Host "Si le site ne repond pas, regardez le journal des taches :"
Write-Host "    Get-ScheduledTaskInfo -TaskName 'Wiki Gratienois'"
