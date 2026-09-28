@echo off
REM ============================================================================
REM demarrer-caddy.bat - lance Caddy pour le wiki sur Windows.
REM
REM A LANCER DANS UNE FENETRE, de preference en "Executer en tant
REM qu'administrateur" : le port 80 est reserve aux administrateurs sous
REM Windows, et sans elevation Caddy refuse de demarrer.
REM
REM Fermer la fenetre arrete Caddy. Pour un demarrage automatique avec le
REM systeme, voir "Au demarrage du PC" dans deploy/windows/README.md.
REM
REM
REM CE FICHIER EST EN ASCII PUR, SANS ACCENT, ET C'EST VOLONTAIRE.
REM
REM cmd.exe ne lit pas un fichier .bat en UTF-8 : il l'interprete dans la
REM page de code du systeme (437 ou 1252). Un accent ecrit ici apparait
REM comme "D-acute-marrage" a l'ecran. Les scripts de ce depot etant relus
REM par des humains autant que par des machines, tous les accents ont ete
REM retires plutot que d'encoder le fichier pour une page de code particuliere.
REM ============================================================================

setlocal

REM --- Emplacement de Caddy -------------------------------------------------
REM winget installe Caddy dans un dossier versionne sous WinGet\Packages, dont
REM le chemin change a chaque mise a jour. On le cherche donc, plutot que de
REM supposer qu'il est dans le PATH : un shell ouvert avant l'installation
REM ne verrait pas la modification du PATH.
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

REM --- Configuration ---------------------------------------------------------
REM Le domaine est lu ici et non dans le fichier : Caddy ne lit un Caddyfile
REM qu'avec son propre environnement, et sous Windows il n'y a pas de
REM "fichier env par service" comme sous Termux.
if not defined WIKI_DOMAINE set "WIKI_DOMAINE=wiki-gratiennois.duckdns.org"
if not defined WIKI_SCHEME  set "WIKI_SCHEME=http://"
if not defined WIKI_PORT    set "WIKI_PORT=3000"

echo Caddy    : %CADDY%
echo Domaine  : %WIKI_DOMAINE%   (mode %WIKI_SCHEME%)
echo Relais   : 127.0.0.1:%WIKI_PORT%
echo.

REM --- Un autre Caddy tourne-t-il deja ? ------------------------------------
REM Symptome rencontre : Caddy demarre, affiche ses lignes de demarrage, puis
REM s'arrete aussitot sans dire pourquoi. La cause est presque toujours un port
REM deja occupe - un Caddy lance precedemment et laisse ouvert, le plus
REM souvent par la meme fenetre qu'on croyait avoir fermee.
REM
REM Caddy ne distingue pas "port occupe" de "configuration invalide" dans sa
REM sortie : mieux vaut le dire ici, avant de lancer.
set "PORT_LIBRE=oui"
for /f "tokens=5" %%p in ('netstat -ano -p TCP ^| findstr "LISTENING" ^| findstr ":80 "') do (
  if not "%%p"=="" set "PORT_LIBRE=non"
)
if "%PORT_LIBRE%"=="non" (
  echo [ERREUR] Le port 80 est deja occupe.
  echo.
  echo Un autre programme ecoute deja dessus. Identifiez-le :
  echo     netstat -ano ^| findstr ":80 " ^| findstr LISTENING
  echo Puis arretez-le, ou changez le port dans le Caddyfile.
  echo.
  echo Si c'est un Caddy que vous avez laisse ouvert, fermez sa fenetre.
  echo.
  pause
  exit /b 1
)

REM --- Validation avant de lancer -------------------------------------------
REM Une erreur de syntaxe ne se voit pas au premier ecran : Caddy demarre
REM normalement, puis echoue plus tard. On valide donc d'abord, pour avoir un
REM refus immediat et lisible.
"%CADDY%" validate --config "%~dp0Caddyfile" --adapter caddyfile
if errorlevel 1 (
  echo.
  echo [ERREUR] La configuration est invalide. Caddy ne demarre pas.
  pause
  exit /b 1
)

REM --- Le wiki est-il lance ? ------------------------------------------------
REM Caddy demarrerait sans erreur avec un wiki absent : le site repondrait 502
REM sur chaque page, et rien dans la fenetre Caddy ne l'indiquerait. On
curl -s -o nul http://127.0.0.1:%WIKI_PORT%/api/health
if errorlevel 1 (
  echo [ATTENTION] Aucun wiki ne repond sur le port %WIKI_PORT%.
  echo.
  echo Lancez-le d'abord, dans une autre fenetre, depuis le projet :
  echo     npm run build
  echo     npm run start
  echo.
  echo Caddy demarre quand meme, mais chaque page repondra 502.
) else (
  echo Wiki joignable sur le port %WIKI_PORT%.
)

echo.
echo Demarrage. Ctrl+C pour arreter.
echo Journal : deploy\windows\caddy.log
echo.

"%CADDY%" run --config "%~dp0Caddyfile" --adapter caddyfile >> "%~dp0caddy.log" 2>&1
set "CODE=%ERRORLEVEL%"

echo.
echo Caddy s'est arrete (code %CODE%).
echo Si le site ne repondait pas, regardez :
echo     type deploy\windows\caddy.log
pause
