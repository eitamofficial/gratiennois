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

REM L'expansion differee est necessaire dans les sous-routines de recherche : on
REM y modifie une variable (OUTIL) a l'interieur d'une boucle for, et on la
REM relit juste apres. Sans elle, la lecture serait figee a l'entree de la
REM boucle et le premier resultat seul serait retenu.
setlocal EnableExtensions EnableDelayedExpansion

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

REM --- FFmpeg et yt-dlp ------------------------------------------------------
REM winget installe ces deux programmes dans le PATH de l'UTILISATEUR, jamais
REM dans celui de la machine. La tache tourne sous SYSTEM : elle ne voit que le
REM PATH machine, ou ffmpeg n'est pas. Sans ce bloc, tout le bot fonctionne et
REM seule la musique manque - un echec difficile a relier a sa cause, puisque
REM rien d'autre n'est casse.
REM
REM On les cherche donc comme Caddy est cherche dans demarrer-caddy.bat, en
REM parcourant tous les profils sous C:\Users\*, puis on exporte les chemins
REM absolus. Le .env ne peut pas les ecraser : chargerEnv() (src/env.ts) ne
REM remplace jamais une variable deja presente dans l'environnement.
set "CHEMIN_FFMPEG="
set "CHEMIN_YTDLP="
call :chercher_outils

if not defined CHEMIN_FFMPEG echo [AVERTISSEMENT] FFmpeg est introuvable : la lecture vocale echouera.
if not defined CHEMIN_YTDLP  echo [AVERTISSEMENT] yt-dlp est introuvable : la recherche de morceaux echouera.

REM Le flux principal reprend ici : le bloc ci-dessous est une sous-routine, et
REM y entrer par defilement lancerait la recherche au lieu du build.
goto :build

REM Cherche FFmpeg et yt-dlp, et ecrit leurs chemins dans CHEMIN_FFMPEG et
REM CHEMIN_YTDLP.
REM
REM Les deux sont traites dans UNE seule sous-routine, et non par deux appels
REM successifs. Au second appel, cmd.exe echouait a retrouver le label et
REM imprimait 'nom de fichier de commandes introuvable' - un message qui ne
REM dit rien du programme cherche, et qui laissait croire a un defaut de
REM configuration. Deux outils dans un meme bloc evitent la situation.
REM
REM Sous SYSTEM, LOCALAPPDATA designe le profil systemprofile, ou winget
REM n'installe rien : sans le passage sur C:\Users\*, les outils paraissent
REM absents alors qu'ils sont installes.
REM
REM On cherche avec `where /r`, et non avec `dir /b /s <dossier a joker>`.
REM Ce dernier ne descend pas dans le repertoire ainsi designe : il s'arrete a
REM son premier niveau, et FFmpeg est deux niveaux plus bas, dans
REM ffmpeg-<version>\bin\. C'est ce qui le faisait paraitre introuvable.
REM
REM Le nom du paquet est resolu d'abord, puis on cherche *dedans* : plusieurs
REM paquets embarquent un ffmpeg (Gyan.FFmpeg et yt-dlp.FFmpeg, entre autres),
REM et le premier venu du cache n'est pas forcement celui qu'on cherche.
:chercher_outils
set "OUTIL="
call :chercher_un "Gyan.FFmpeg" "ffmpeg.exe"
if defined OUTIL set "CHEMIN_FFMPEG=%OUTIL%"
call :chercher_un "yt-dlp.yt-dlp" "yt-dlp.exe"
if defined OUTIL set "CHEMIN_YTDLP=%OUTIL%"
goto :eof

:chercher_un
set "PROG=%~1"
set "EXE=%~2"
set "OUTIL="

for /f "delims=" %%i in ('where %~2 2^>nul') do if not defined !OUTIL! set "OUTIL=%%i"
if defined OUTIL goto :eof

call :dans_paquet "%LOCALAPPDATA%\Microsoft\WinGet\Packages" "%PROG%" "%EXE%"
if defined OUTIL goto :eof

for /f "delims=" %%u in ('dir /b /ad "%SystemDrive%\Users" 2^>nul') do (
  if not defined !OUTIL! call :dans_paquet "%SystemDrive%\Users\%%u\AppData\Local\\Microsoft\WinGet\Packages" "%PROG%" "%EXE%"
)
if defined OUTIL goto :eof

REM Dernier recours : un dossier malgre, comme chocolatey ou un installateur
REM classique, ou le nom du paquet ne dit rien.
for /f "delims=" %%u in ('dir /b /ad "%SystemDrive%\Users" 2^>nul') do (
  if not defined !OUTIL! for /f "delims=" %%i in ('where /r "%SystemDrive%\Users\%%u\AppData\Local" %~2 2^>nul') do if not defined !OUTIL! set "OUTIL=%%i"
)
if defined OUTIL goto :eof
for /f "delims=" %%i in ('where /r "%SystemDrive%\ProgramData" %~2 2^>nul') do if not defined !OUTIL! set "OUTIL=%%i"
goto :eof

:dans_paquet
if defined !OUTIL! goto :eof
for /f "delims=" %%d in ('dir /b /ad "%~1\%~2*" 2^>nul') do (
  if not defined !OUTIL! for /f "delims=" %%i in ('where /r "%~1\%%d" %~3 2^>nul') do if not defined !OUTIL! set "OUTIL=%%i"
)
goto :eof

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

REM --- Boucle ----------------------------------------------------------------
REM Windows n'a pas d'equivalent de termux-services : c'est cette boucle qui
REM relance le bot s'il s'arrete, comme pour le wiki et pour Caddy.
:boucle
echo [INFO] DelphinaBot demarre depuis %BOT%
if defined CHEMIN_FFMPEG echo [INFO] ffmpeg  : %CHEMIN_FFMPEG%
if defined CHEMIN_YTDLP echo [INFO] yt-dlp : %CHEMIN_YTDLP%
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
