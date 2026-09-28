@echo off
REM ============================================================================
REM demarrer-wiki.bat - fait tourner le wiki, et le relance s'il tombe.
REM
REM A installer comme tache planifiee, demarrage automatique, avec privileges
REM eleves (voir installer-services.ps1). N'est pas prevu pour etre lance a la
REM main : le but est justement de ne pas avoir de fenetre a garder ouverte.
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

cd /d "%PROJET%" || (
  echo [ERREUR] Projet introuvable : %PROJET%
  pause
  exit /b 1
)

set "WIKI_PORT=3000"
if not defined WIKI_PORT set "WIKI_PORT=3000"

REM --- Fichiers necessaires au build -----------------------------------------
REM `next start` sert la compilation presente dans .next. Si le PC a redemarre
REM sans que le build ait eu lieu, le wiki refuserait de demarrer avec une
REM erreur peu parlante. On construit donc au besoin, et on repete tant que
REM l'echec persiste : un build casse ne doit pas empecher la tache de
REM redemarrer plus tard, une fois le probleme corrige.
:build
if exist "%PROJET%\.next\BUILD_ID" goto :boucle
echo [INFO] Pas de compilation prealable, lancement du build...
call npm run build
if not errorlevel 1 goto :boucle
echo [ERREUR] Le build a echoue. Nouvelle tentative dans 60s.
timeout /t 60 /nobreak > nul
goto :build

REM --- Boucle ----------------------------------------------------------------
REM Sur Android, termux-services surveille le processus et le relance. Windows
REM n'a pas d'equivalent pour un programme en ligne de commande : c'est
REM Planificateur de taches qui joue le role, mais il ne relance pas un script
REM qui a rendu la main. Cette boucle fait le meme travail.
:boucle
echo [INFO] Wiki demarre sur le port %WIKI_PORT%, depuis %PROJET%
call npm start
echo [INFO] Le wiki s'est arrete (code %ERRORLEVEL%). Nouvelle tentative dans 15s.
timeout /t 15 /nobreak > nul
goto :boucle
