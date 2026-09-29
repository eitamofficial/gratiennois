# redemarrer-wiki.ps1 - relance le wiki et Caddy, et attend qu'ils répondent.
#
# À lancer DANS UN TERMINAL ADMINISTRATEUR. Le wiki et Caddy tournent sous
# le compte SYSTEM via deux tâches planifiées : sans élévation, on ne peut ni
# les arrêter ni les interroger, et un `taskkill` se fait refuser.
#
#   powershell -ExecutionPolicy Bypass -File .\deploy\windows\redemarrer-wiki.ps1
#
# Options :
#   -SansCaddy   ne touche pas à Caddy (utile si le domaine est déjà bon)
#   -DelphinaBot relance aussi le bot, si la tâche a été installée
#
# Pourquoi un script plutôt que trois commandes : l'ordre compte. On arrête
# avant de démarrer, on attend que le port réponde réellement au lieu de
# supposer que le processus est prêt, et on dit ce qui a échoué.

[CmdletBinding()]
param(
  [switch] $SansCaddy,
  [switch] $DelphinaBot,
  [int] $Port = 3000,
  [int] $DelaiSecondes = 90
)

$ErrorActionPreference = 'Stop'

# --- Droits ------------------------------------------------------------------

$identite = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identite)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "[ERREUR] Ce script doit etre execute en administrateur." -ForegroundColor Red
  Write-Host ""
  Write-Host "  Clic droit sur Windows Terminal (ou PowerShell) > Executer en tant"
  Write-Host "  qu'administrateur, puis relancez la commande."
  Write-Host ""
  exit 1
}

# --- Fonctions ----------------------------------------------------------------

function Tester-Tache {
  param([string] $Nom)
  $tache = Get-ScheduledTask -TaskName $Nom -ErrorAction SilentlyContinue
  if ($null -eq $tache) {
    Write-Host "  [INFO] Tache absente : $Nom" -ForegroundColor DarkGray
    return $null
  }
  return $tache
}

function Redemarrer-Tache {
  param([string] $Nom)

  $tache = Tester-Tache -Nom $Nom
  if ($null -eq $tache) { return $false }

  Write-Host "  [INFO] Arret de '$Nom'..."
  # Stop-ScheduledTask tue l'arbre de processus de la tache. Le script .bat
  # qui boucle sur `npm start` disparait avec : c'est le but.
  Stop-ScheduledTask -TaskName $Nom -ErrorAction SilentlyContinue

  # On laisse le port se liberer. Un arret brutal peut laisser le socket en
  # TIME_WAIT quelques secondes ; demarrer trop tot ferait echouer la tache,
  # qui ne se relanecerait qu'a l'arret suivant de la machine.
  Start-Sleep -Seconds 3

  Write-Host "  [INFO] Demarrage de '$Nom'..."
  Start-ScheduledTask -TaskName $Nom
  return $true
}

function Attendre-Port {
  param([int] $Port, [int] $Secondes)

  $deadline = (Get-Date).AddSeconds($Secondes)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
      if ($async.AsyncWaitHandle.WaitOne(1000) -and $client.Connected) {
        $client.EndConnect($async)
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {
      # Le port n'ecoute pas encore : on recommence.
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

# --- Redemarrage --------------------------------------------------------------

Write-Host ""
Write-Host "Redemarrage du wiki" -ForegroundColor Cyan
Write-Host "====================="

Redemarrer-Tache -Nom 'Wiki Gratienois' | Out-Null

if (-not $SansCaddy) {
  Redemarrer-Tache -Nom 'Wiki Caddy' | Out-Null
}

if ($DelphinaBot) {
  Redemarrer-Tache -Nom 'Wiki DelphinaBot' | Out-Null
}

# --- Attente ------------------------------------------------------------------

Write-Host ""
Write-Host "Attente de la reponse sur le port $Port..."
if (Attendre-Port -Port $Port -Secondes $DelaiSecondes) {
  Write-Host "  [OK] Le wiki repond sur le port $Port." -ForegroundColor Green
} else {
  Write-Host "  [ERREUR] Aucune reponse sur le port $Port apres $DelaiSecondes s." -ForegroundColor Red
  Write-Host ""
  Write-Host "  La tache 'Wiki Gratienois' a pu echouer au demarrage. causes"
  Write-Host "  habituelles :"
  Write-Host "    - compilation absente ou cassee (le .bat la relance en boucle,"
  Write-Host "      mais elle echoue alors toutes les 60 s) ;"
  Write-Host "    - Node absent du PATH de la machine ;"
  Write-Host "    - port $Port deja occupe par un autre processus."
  Write-Host ""
  Write-Host "  Journal du Planificateur de taches :"
  Write-Host "    \$env:SystemRoot\System32\LogFiles\WMI\Operational"
  exit 1
}

Write-Host ""
Write-Host "Termine." -ForegroundColor Cyan
Write-Host ""
