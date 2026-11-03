#!/system/bin/sh
# Wiki du IIIe Delphinat + DelphinaBot V2 + Caddy — démarrage au boot Android.
#
# À copier dans /data/adb/service.d/wiki-gratiennois.sh (KernelSU / Magisk).
# Ce dossier est exécuté par le gestionnaire de root au démarrage du système,
# sans qu'il faille ouvrir l'application Termux — c'est ce qui rend le wiki
# joignable après une coupure de courant, sans intervention.
#
# Trois processus surveillés, plus l'enregistrement DuckDNS :
#   1. le wiki (Next.js) sur 127.0.0.1:3000
#   2. DelphinaBot V2 (discord.js)
#   3. Caddy, portier HTTPS des ports 80 et 443, pour les deux domaines
#   4. le maintien de wiki-gratiennois.duckdns.org
#
# Chaque boucle relance son processus : sur Android il n'y a ni systemd ni
# redémarrage automatique, et un `next start` qui meurt laisserait le site
# éteint jusqu'au prochain redémarrage de la tablette.

sleep 30

APP_HOME=/data/data/com.termux/files/home
APP_PREFIX=/data/data/com.termux/files/usr
app_uid=10279

mkdir -p "$APP_PREFIX/tmp"
chown "$app_uid:$app_uid" "$APP_PREFIX/tmp" 2>/dev/null

# Caddy tourne en root : il doit lier les ports 80 et 443, réservés au root
# sur Android (ip_unprivileged_port_start = 1024). Ses certificats et son
# journal vivent hors de l'espace de l'application Termux.
mkdir -p /data/adb/caddy/data /data/adb/caddy/config /data/adb/caddy/logs

# Le verrou d'écran empêche Android de suspendre Termux dès que l'écran
# s'éteint — sans lui, le wiki et le bot s'arrêtent au bout de quelques minutes.
su -g $app_uid -G 3003 -G 1015 $app_uid -c "$APP_HOME/tx.sh termux-wake-lock" >/dev/null 2>&1

# 1. Le wiki (Next.js), port 3000
setsid sh -c "
while true; do
  su -g $app_uid -G 3003 -G 1015 $app_uid -c '$APP_HOME/tx.sh bash $APP_HOME/wiki/deploy/termux/run-wiki' >> '$APP_HOME/wiki-service.log' 2>&1
  sleep 15
done
" >/dev/null 2>&1 &

# 2. DelphinaBot V2
setsid sh -c "
while true; do
  su -g $app_uid -G 3003 -G 1015 $app_uid -c '$APP_HOME/tx.sh bash $APP_HOME/wiki/deploy/termux/run-delphinabot' >> '$APP_HOME/bot-service.log' 2>&1
  sleep 20
done
" >/dev/null 2>&1 &

# Laisse le wiki ouvrir son port : Caddy répondrait 502 pendant ce temps, ce
# qui n'est pas grave mais salit le journal au démarrage.
sleep 15

# 3. Caddy, portier HTTPS (80 et 443) des deux domaines
setsid sh -c "
while true; do
  HOME=$APP_HOME PREFIX=$APP_PREFIX \
  XDG_DATA_HOME=/data/adb/caddy/data \
  XDG_CONFIG_HOME=/data/adb/caddy/config \
  $APP_PREFIX/bin/caddy run --config $APP_HOME/caddy/Caddyfile >> /data/adb/caddy/logs/service.log 2>&1
  sleep 10
done
" >/dev/null 2>&1 &

# 4. DuckDNS : sans ce rafraîchissement, DuckDNS oublie l'adresse au bout de
#    quelques semaines et le domaine cesse de résoudre, certificat valide ou non.
#
#    Le jeton n'est PAS écrit ici. Ce script est versionné dans un dépôt public :
#    un jeton en clair permettrait à n'importe qui de repointer le sous-domaine.
#    Il se lit donc dans un fichier local, créé une fois sur la tablette :
#
#      printf 'DUCKDNS_TOKEN=%s\n' 'votre-jeton' > $APP_HOME/.duckdns-token
#      chmod 600 $APP_HOME/.duckdns-token
#
#    Sans ce fichier, l'étape est simplement sautée : le reste du démarrage
#    (wiki, bot, Caddy) n'en dépend pas.
DUCKDNS_TOKEN=""
if [ -f "$APP_HOME/.duckdns-token" ]; then
  . "$APP_HOME/.duckdns-token"
fi

if [ -n "$DUCKDNS_TOKEN" ]; then
  setsid sh -c "
  sleep 60
  while true; do
    $APP_PREFIX/bin/curl -s 'https://www.duckdns.org/update?domains=wiki-gratiennois&token=$DUCKDNS_TOKEN&ip=' >/dev/null 2>&1
    sleep 300
  done
  " >/dev/null 2>&1 &
else
  echo "DuckDNS : jeton absent ($APP_HOME/.duckdns-token) — rafraîchissement désactivé." \
    >> "$APP_HOME/wiki-service.log"
fi
