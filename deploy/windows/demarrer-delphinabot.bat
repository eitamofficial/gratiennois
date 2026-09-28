@echo off
REM ============================================================================
REM demarrer-delphinabot.bat - fait tourner DelphinaBot, et le relance s'il tombe.
REM
REM A installer comme tache planifiee, demarrage automatique, avec privileges
REM eleves (voir installer-services.ps1 -DelphinaBot). N'est pas prevu pour etre
REM lance a la main : le but est justement de ne pas avoir de fenetre a garder
REM ouverte.
REM
REM
REM CE FICHIER EST EN ASCII PUR, SANS ACCENT, ET C'EST VOLONTAIRE.
REM
REM cmd.exe ne lit pas un fichier .bat en UTF-8 : il l'interprete dans la page
REM de code du systeme. Un accent ecrit ici apparaitrait comme "D-acute-marrage"
REM a l'ecran. Tous les accents ont ete retires plutot que d'encoder le
REM fichier pour une page de code particuliere.
REM ============================================================================

setlocal

REM --- Racine du projet ------------------------------------------------------
REM Le script vit dans <projet>\deploy\windows ; le projet est deux niveaux
REM au-dessus. On le deduit plutot que de le coder en dur : un chemin fige
REM dans une tache planifiee casse des que le dossier est deplace ou renomme.
set "PROJET=%~dp0..\.."
for %%i in ("%PROJET%") do set "PROJET=%%~fi"
set "BOT=%PROJET%\delphinabot"

if not exist "%BOT%\package.json" goto :introuvable

cd /d "%BOT%" || (
  echo [ERREUR] Repertoire introuvable : %BOT%
  goto :attendre
)

REM --- Node est-il la ? --------------------------------------------------------
REM La tache planifiee tourne sous SYSTEM, dont l'environnement est distinct de
REM le votre. Node doit donc etre installe au niveau de la machine
REM (C:\Program Files\nodejs), et non via nvm ou un gestionnaire de versions
REM qui le place dans le profil : dans ce cas `npm` est introuvable et le
REM script echoue sur un message incomprehensible, sans rien journaliser.
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] npm est introuvable dans l'environnement de cette tache.
  echo.
  echo Node doit etre installe pour tout le systeme, pas seulement pour votre
  echo compte. Reinstallez-le depuis https://nodejs.org en gardant l'option
  echo "Add to PATH" cochee, puis relancez cette tache.
  goto :attendre
)

REM --- Configuration ---------------------------------------------------------
REM Sans DISCORD_BOT_TOKEN, le bot refuse de demarrer et le dit en clair.
REM On le verifie ici pour que le journal Windows indique la cause exacte,
REM plutot que de laisser le bot se taire toutes les dix minutes.
if not exist "%BOT%\.env" (
  echo [ERREUR] %BOT%\.env est absent.
  echo.
  echo Copiez delphinabot\.env.example en delphinabot\.env et renseignez au
  echo minimum DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID et DATABASE_URL.
  goto :attendre
)

REM --- Compilation ------------------------------------------------------------
REM Le bot s'execute depuis dist\, produit par `npm run build`. Si le PC a
REM redemarre sans que la compilation ait eu lieu, le demarrage echouerait sur
REM un module introuvable. On compile donc au besoin, et on repete tant que
REM l'echec persiste : une compilation cassee ne doit pas empecher la tache de
REM redemarrer plus tard, une fois le probleme corrige.
:build
if exist "%BOT%\dist\index.js" goto :boucle
echo [INFO] Pas de compilation prealable, lancement du build...
call npm run build
if not errorlevel 1 goto :boucle
echo [ERREUR] La compilation a echoue. Nouvelle tentative dans 60s.
timeout /t 60 /nobreak > nul
goto :build

REM --- Boucle ----------------------------------------------------------------
REM Windows n'a pas d'equivalent de termux-services : c'est cette boucle qui
REM relance le bot s'il s'arrete, comme pour le wiki et pour Caddy.
:boucle
echo [INFO] DelphinaBot demarre depuis %BOT%
call npm start
echo [INFO] DelphinaBot s'est arrete (code %ERRORLEVEL%). Nouvelle tentative dans 20s.
timeout /t 20 /nobreak > nul
goto :boucle

REM --- Sorties d'erreur -------------------------------------------------------
REM Aucune de ces lignes ne doit bloquer la tache : un `pause` y laisserait le
REM Planificateur de taches en attente indefiniment, et l'arret suivant de
REM Windows ne serait plus jamais propre. On affiche, on attend, on sort avec
REM un code de succes pour que l'evenement paraisse normal.
:introuvable
echo [ERREUR] Le dossier delphinabot est introuvable sous %PROJET%.
goto :attendre

:attendre
echo Nouvelle tentative dans 120s. Corrigez le probleme ci-dessus d'ici la.
timeout /t 120 /nobreak > nul
exit /b 0
