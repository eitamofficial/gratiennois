# Recupere les sauvegardes du wiki depuis la tablette, via adb.
#
# Ce script est la moitie "externe" de la sauvegarde : la tablette produit des
# archives chiffrees, ce script les rapatrie sur le PC. Deux machines, deux
# disques, deux pannes possibles -- c'est ce qui distingue une sauvegarde d'une
# copie sur le meme disque.
#
# Pourquoi passer par /sdcard : /data/data/com.termux/files/home appartient a
# l'application Termux, et le shell adb n'y a pas acces. On copie donc l'archive
# vers le stockage partage avec su, puis on la tire.
#
# Usage :
#   .\recuperer-sauvegardes.ps1
#   .\recuperer-sauvegardes.ps1 -Destination "D:\Sauvegardes\Wiki"
#
# Planification (une fois par jour, 3 h du matin) :
#   schtasks /Create /SC DAILY /ST 03:00 /TN "Sauvegarde wiki" ^
#     /TR "powershell -ExecutionPolicy Bypass -File \"%CD%\recuperer-sauvegardes.ps1\""

param(
    [string]$Destination = "$env:USERPROFILE\Sauvegardes\WikiGratiennois"
)

$ErrorActionPreference = "Stop"

function Ecrire([string]$message) {
    Write-Host ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message)
}

# --- 1. La tablette est-elle la ? -------------------------------------------
$appareils = & adb devices 2>&1 | Select-String -Pattern "^\S+\s+device$"
if (-not $appareils) {
    Ecrire "Aucune tablette connectee en adb. Branchez l'USB et activez le debogage."
    exit 1
}

# --- 2. Empaqueter cote tablette --------------------------------------------
$distant = "/sdcard/Download/sauvegardes-wiki.tar.gz"
Ecrire "Preparation de l'archive sur la tablette..."

# Le tar contient deja des archives chiffrees : le refaire chiffrer n'ajoute rien.
$commande = "cd /data/data/com.termux/files/home && tar czf $distant sauvegardes && echo OK"
$resultat = & adb shell su -c $commande 2>&1
if ($resultat -notmatch "OK") {
    Ecrire "Echec de la preparation : $resultat"
    exit 1
}

# --- 3. Rapatrier -----------------------------------------------------------
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$local = Join-Path $Destination ("lot-" + (Get-Date -Format "yyyy-MM-dd_HHmmss") + ".tar.gz")

Ecrire "Transfert vers $local..."
& adb pull $distant $local 2>&1 | Out-Null
if (-not (Test-Path $local)) {
    Ecrire "Le transfert a echoue."
    exit 1
}

& adb shell su -c "rm -f $distant" 2>&1 | Out-Null

# --- 4. Extraire ------------------------------------------------------------
Ecrire "Extraction..."
$extraction = Join-Path $Destination "archives"
New-Item -ItemType Directory -Force -Path $extraction | Out-Null
tar -xzf $local -C $extraction
Remove-Item $local -Force

# --- 5. Verifier que le lot contient bien quelque chose ---------------------
$archives = Get-ChildItem -Path (Join-Path $extraction "sauvegardes") -Filter "wiki-*.tar.gz.enc" -ErrorAction SilentlyContinue
if (-not $archives) {
    Ecrire "Aucune archive trouvee apres extraction."
    exit 1
}

$derniere = $archives | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$taille = [math]::Round($derniere.Length / 1KB, 1)
Ecrire ("Termine : {0} archive(s), la plus recente fait {1} Ko." -f $archives.Count, $taille)
Ecrire ("Emplacement : {0}" -f $extraction)
Ecrire "Rappel : ces archives sont chiffrees. Sans la phrase de passe, elles sont illisibles."
