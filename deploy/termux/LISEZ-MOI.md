# Héberger le wiki sur une tablette Android (Termux, Caddy, DuckDNS)

Ce guide installe le wiki sur une tablette rootée, accessible en HTTPS sous un
sous-domaine DuckDNS, avec renouvellement automatique du certificat.

Il suppose que le projet est déjà cloné sur la tablette et que `npm run build` y
réussit. Tout ce qui suit concerne uniquement la mise en service.

**Ce que cet hébergement donne, et ce qu'il ne donne pas.** Le wiki sera
 joignable sur Internet, en HTTPS, avec un certificat valide. Il ne sera
 disponible que lorsque la tablette est allumée, connectée et où Android ne
 suspend pas Termux. Il n'y a ni CDN, ni reprise sur panne, ni supervision.

---

## 1. Les paquets

```bash
pkg update && pkg upgrade
pkg install nodejs-lts git caddy termux-services curl openssl-tool
```

`termux-services` remplace systemd : c'est lui qui surveille les services et les
relance. Sans lui, un wiki arrêté l'est jusqu'au redémarrage de la tablette.

## 2. Le projet et sa compilation

```bash
cd ~
git clone <votre-dépôt> wiki
cd wiki
npm ci
cp .env.example .env      # puis remplissez-le, voir plus bas
npm run build
```

Le `.env` de la tablette est spécifique. Les deux lignes qui comptent :

```
SITE_URL=https://monwiki.duckdns.org
AUTH_SECRET=<openssl rand -base64 32>
```

`SITE_URL` doit correspondre **exactement** au domaine du Caddyfile : c'est
cette URL qui part dans le sitemap, les métadonnées OpenGraph et les partages
sociaux.

**Ne mettez pas de `DATABASE_URL` si vous voulez rester sur la tablette.** Sans
elle, le wiki stocke tout dans `data/` sous forme de fichiers JSON, ce qui
fonctionne très bien : le disque est durable. Avec elle, il utilise PostgreSQL.
Les deux sont corrects ici, contrairement à Vercel.

Pour une tablette, l'option JSON est préférable : rien à exploiter, et une
sauvegarde se réduit à copier un dossier.

## 3. Le sous-domaine DuckDNS

1. Créez un compte sur <https://www.duckdns.org>.
2. Créez le sous-domaine, par exemple `monwiki`.
3. Notez le **jeton** affiché en haut de la page. Il vous faut les deux : le
   sous-domaine et le jeton.

DuckDNS ne fournit pas de certificat. C'est Caddy qui l'obtiendra, et pour cela
le port 80 doit être joignable depuis Internet — voir l'étape 6.

## 4. Les services

Chaque service est un dossier contenant un exécutable `run` et un fichier `env`.

```bash
PREFIX=/data/data/com.termux/files/usr
DESTINATAIRE=$(pwd)/deploy/termux

for service in wiki sync-discord duckdns caddy; do
  mkdir -p "$PREFIX/var/service/$service"
  cp "$DESTINATAIRE/run-$service" "$PREFIX/var/service/$service/run"
  chmod +x "$PREFIX/var/service/$service/run"
done
```

Puis les variables, une par service :

```bash
for service in wiki sync-discord duckdns caddy; do
  cp deploy/termux/env.exemple "$PREFIX/var/service/$service/env"
done
```

Renseignez au minimum `WIKI_DIR`, `WIKI_DOMAINE`, `DUCKDNS_TOKEN` et
`DUCKDNS_DOMAIN` dans le fichier `duckdns/env`, et vérifiez que `WIKI_DIR` est le
bon chemin dans les deux autres.

Enfin, on active :

```bash
sv-enable wiki
sv-enable sync-discord
sv-enable duckdns
sv-enable caddy
sv up wiki          # les autres démarrent au prochain démarrage
```

## 5. Caddy, en HTTP d'abord

```bash
mkdir -p ~/caddy
cp deploy/termux/Caddyfile ~/caddy/Caddyfile
```

Remplacez `monwiki.duckdns.org` par votre domaine, et vérifiez que le fichier
`$PREFIX/var/service/caddy/env` contient :

```
WIKI_DOMAINE=monwiki.duckdns.org
WIKI_SCHEME=http://
```

**Le mode `http://` est le point de départ, et il n'exige rien sur votre box.**
Le wiki répond en HTTP simple, sur le port 80. C'est volontairement le premier
mode : vous pouvez vérifier que tout fonctionne avant de vous battre avec la
redirection de port.

Le mode par défaut du fichier `env` est `http://`. Ne le passez pas en `https://`
tout de suite.

Caddy tourne comme les autres services, et ce n'est pas un détail de confort :
le Caddyfile fait référence à `{$WIKI_DOMAINE}` et `{$WIKI_SCHEME}`, que Caddy
ne lit que depuis son propre environnement. Lancé à la main, il refuserait de
démarrer. Le service charge le fichier `env` avant de le lancer, ce qui règle le
problème.

```bash
sv up caddy
tail -f $PREFIX/var/service/caddy/caddy.log
```

Vérifiez que le wiki répond bien en HTTP, sans redirection :

```bash
curl -i http://monwiki.duckdns.org/api/health
```

Une ligne `HTTP/1.1 200 OK` : tout va bien. Un `301` ou un `308` vers `https://`
signifie que `WIKI_SCHEME` est encore à `https://` dans le `env` du service —
repassez-le à `http://`, puis `sv restart caddy`.

**Le port 80 pose problème sur Android.** Les ports inférieurs à 1024 sont
réservés au root. Beaucoup de noyaux Android les ouvrent pourtant aux
applications ordinaires. Le service gère les deux cas : il tente d'abord sans
élévation, et si le processus meurt en quelques secondes, il se relance en root
tout seul. Vous n'avez rien à décider, mais un démarrage qui bascule sur root se
voit dans `caddy.log`.


## 6. La redirection de port, côté box

C'est l'étape qu'on oublie, et sans elle le site n'est visible de l'extérieur
que sur votre Wi-Fi. Elle ne concerne que la box : la tablette n'y touche pas.

Dans l'interface de votre box, redirigez :

| Port externe | Port interne | Protocole |
|---|---|---|
| 80 | 80 (tablette) | TCP |

L'adresse interne est celle de la tablette sur le Wi-Fi. **Donnez-lui une IP
fixe** dans les réglages DHCP de la box, sinon elle changera et la redirection
pointera dans le vide.

Testez depuis l'extérieur, pas depuis le Wi-Fi — depuis le réseau local, le test
ne prouve rien. Un téléphone en 4G est lideal.

Une fois le port 80 redirigé, le wiki est en ligne en HTTP. Passez alors au
HTTPS, à l'étape 6 bis.


## 6 bis. Le HTTPS

Le port 80 ouvert, Let's Encrypt peut valider le domaine. Basculez le service :

```bash
# dans $PREFIX/var/service/caddy/env
WIKI_SCHEME=https://

sv restart caddy
tail -f $PREFIX/var/service/caddy/caddy.log
```

Caddy obtient le certificat, le renouvelle tout seul, et redirige désormais le
HTTP vers le HTTPS. Comptez une minute. Il ne reste qu'à ouvrir le port 443
dans la box, par la même procédure que le 80.

Si le journal indique un échec d'obtention de certificat, le port 80 n'est en
réalité pas joignable. Revenez en arrière avec `WIKI_SCHEME=http://` : le wiki
redevient accessible, ce qui permet de ne jamais rester bloqué sur un problème
de certificat.

## 7. Que la tablette reste éveillée

Android suspend les applications en arrière-plan dès que l'écran s'éteint, ce qui
tuerait le wiki. Trois mesures :

```bash
termux-wake-lock
termux-job-scheduler
```

Dans les réglages Android de la tablette : **Applications → Termux → Battery →
Unrestricted** (ou « Sans restriction »), et **autoris l'exécution en arrière-plan**.

Sur une tablette rootée, vous pouvez rendre ce réglage permanent :

```bash
su -c "dumpsys deviceidle whitelist +com.termux"
```

## 8. Démarrage au boot

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-wiki <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
sv up wiki
EOF
chmod +x ~/.termux/boot/start-wiki
```

Le répertoire `~/.termux/boot` est exécuté par Termux au démarrage du système, si
l'application Termux est autorisée à démarrer au boot (réglages Android →
Applications → Termux → « Lancer au démarrage »).

---

## Vérifier que tout fonctionne

```bash
# Le wiki répond-il en local, sur la tablette ?
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health

# Le sous-domaine répond-il ? Depuis l'extérieur, en 4G de préférence.
curl -i http://monwiki.duckdns.org/api/health

# L'état des services ?
sv status wiki sync-discord duckdns

# Les journaux ?
tail -f $PREFIX/var/service/wiki/log/x
```

`/api/health` doit répondre `200` et afficher `"durable": true`. S'il affiche
`false`, le wiki croit être sur un système de fichiers éphémère, ce qui
signalerait une variable d'environnement parasite.

## Sauvegarder le contenu

Si vous restez en stockage JSON, tout le wiki tient dans `data/` :

```bash
tar czf ~/sauvegarde-wiki-$(date +%F).tar.gz -C ~/wiki data
```

Si vous utilisez PostgreSQL, utilisez `pg_dump` — les fichiers JSON ne
contiendraient alors rien.

## Dépannage

**« Caddy n'obtient pas de certificat »** — le port 80 n'atteint pas la
tablette. Vérifiez la redirection de port, et que le port 80 est bien joignable
depuis l'extérieur. En attendant, repassez `WIKI_SCHEME=http://` dans le `env` du
service caddy : le wiki redevient accessible en clair.

**Le site redirige vers `https://` alors que rien n'est configuré** —
`WIKI_SCHEME` est encore à `https://` dans le `env` du service caddy. Le mode
HTTP est le point de départ normal ; le HTTPS demande le port 80 ouvert.

**Le site est en ligne mais vide** — la base n'a pas été amorcée. Connectez-vous
en Dauphin et lancez « Installer / mettre à niveau » dans `/admin`.

**Le wiki s'arrête au bout de quelques minutes** — Android le suspend. Reprenez
les mesures de l'étape 7.

**« permission denied » au démarrage de Caddy** — le port 80 est bien réservé.
Lancez Caddy avec `su -c` et le chemin complet, comme indiqué à l'étape 5.
