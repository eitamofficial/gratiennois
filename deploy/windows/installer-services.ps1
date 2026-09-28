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
#     powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1
#
# Pour retirer :
#
#     powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -Desinstaller

param([switch]$Desinstaller)

$ErrorActionPreference = "Stop"

$racine = (Resolve-Path "$PSScriptRoot\..\..").Path
$fenetre = "$PSScriptRoot"

function Taches {
  "Wiki Gratienois", "Wiki Caddy", "Wiki DuckDNS"
}

# --- Desinstallation --------------------------------------------------------
if ($Desinstaller) {
  foreach ($t in Taches) {
    schtasks /Delete /TN $t /F 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Write-Host "Supprimee : $t" }
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

Write-Host "Racine du projet : $racine"
Write-Host ""

# --- Nettoyage --------------------------------------------------------------
# On repart d'une installation propre : une tache existante avec des reglages
# de l'ancienne version serait conservee telle quelle par /Create, qui echoue
# silencieusement si le nom est deja pris.
foreach ($t in Taches) { schtasks /Delete /TN $t /F 2>&1 | Out-Null }

# --- Taches ----------------------------------------------------------------
function Creer {
  param($Nom, $Commande, $Declencheur, $RepeterMinutes)

  if ($RepeterMinutes) {
    schtasks /Create /TN $Nom /SC MINUTE /MO $RepeterMinutes /RU SYSTEM /RL HIGHEST /F /TR $Commande | Out-Null
  } else {
    schtasks /Create /TN $Nom /SC ONSTART /RU SYSTEM /RL HIGHEST /F /TR $Commande | Out-Null
  }

  if ($LASTEXITCODE -ne 0) { throw "Echec de la creation de la tache '$Nom'." }
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
  -Commande "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$fenetre\sync-duckdns.ps1`"" `
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
Write-Host "Ne demarrez la tache DuckDNS qu'apres avoir defini DUCKDNS_TOKEN :"
Write-Host '    setx DUCKDNS_TOKEN "votre-jeton"'
Write-Host '    setx WIKI_DOMAINE "wiki-gratienmois"'
