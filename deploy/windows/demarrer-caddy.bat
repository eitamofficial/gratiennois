@echo off
REM =============================================================================
REM demarrer-caddy.bat — lance Caddy pour le wiki sur Windows.
REM
REM À lancer dans une fenêtre (double-clic), ou via le Planificateur de tâches
REM au démarrage. Double-cliquer est sans effet de toute façon : le processus
REM reste au premier plan et s'arrête avec la fenêtre. Pour un service durable,
REM voir « Installer comme service » dans deploy/windows/LISEZ-MOI.md.
REM
REM Le port 80 est réservé aux administrateurs sur Windows. Caddy ne pourra pas
REM le lier sans élévation : ouvrez cette fenêtre en « Exécuter en tant
REM qu'administrateur », ou réservez le port 80 à une exception dans
REM netsh (voir le guide).
REM =============================================================================

setlocal

REM --- Emplacement de Caddy -------------------------------------------------
REM winget l'installe dans un dossier versionné sous WinGet\Packages ; le
REM chemin change à chaque mise à jour. On le cherche donc, plutôt que de
REM supposer qu'il est dans le PATH — un shell ancien ne verra pas la
REM modification du PATH faite par l'installateur.
set "CADDY="
where caddy >nul 2>&1 && set "CADDY=caddy"

if not defined CADDY (
  for /f "delims=" %%i in ('dir /b /s "%LOCALAPPDATA%\Microsoft\WinGet\Packages\CaddyServer.Caddy*" 2^>nul') do (
    if exist "%%i\caddy.exe" set "CADDY=%%i\caddy.exe"
  )
)

if not defined CADDY (
  echo [ERREUR] Caddy est introuvable.
  echo.
  echo Installez-le avec :
  echo     winget install --id CaddyServer.Caddy --exact
  echo.
  pause
  exit /b 1
)

echo Caddy : %CADDY%

REM --- Configuration ---------------------------------------------------------
REM Le domaine est lu ici et non dans le fichier : Caddy ne lit un Caddyfile
REM qu'avec son propre environnement, et sur Windows il n'y a pas de
REM « fichier env par service » comme sous Termux.
if not defined WIKI_DOMAINE set "WIKI_DOMAINE=wiki-gratiennois.duckdns.org"
if not defined WIKI_SCHEME  set "WIKI_SCHEME=http://"
if not defined WIKI_PORT    set "WIKI_PORT=3000"

echo Domaine : %WIKI_DOMAINE%   (mode %WIKI_SCHEME%, relais vers 127.0.0.1:%WIKI_PORT%)

REM --- Validation avant de lancer -------------------------------------------
REM Une erreur de syntaxe ne s'interrompt pas à la première ligne mais apres
REM le demarrage. On valide donc d'abord : un refus est immediat et lisible.
"%CADDY%" validate --config "%~dp0Caddyfile" --adapter caddyfile
if errorlevel 1 (
  echo.
  echo [ERREUR] La configuration est invalide. Caddy ne démarre pas.
  pause
  exit /b 1
)

REM --- Le wiki est-il lance ? ------------------------------------------------
REM Caddy démarrerait très bien avec un wiki absent : le site répondrait 502,
REM et rien dans lafenetre Caddy ne l'indiquerait. On le verifie donc ici.
curl -s -o nul -w "" http://127.0.0.1:%WIKI_PORT%/api/health
if errorlevel 1 (
  echo.
  echo [ATTENTION] Aucun wiki ne répond sur le port %WIKI_PORT%.
  echo Lancez-le d'abord, depuis le projet :
  echo     npm run build
  echo     npm run start
  echo.
  echo Caddy démarre quand même, mais toutes les pages répondront 502.
)

echo.
echo Démarrage. Ctrl+C pour arrêter.
echo Journal : deploy\windows\caddy.log
echo.

"%CADDY%" run --config "%~dp0Caddyfile" --adapter caddyfile >> "%~dp0caddy.log" 2>&1

echo.
echo Caddy s'est arrêté.
pause
