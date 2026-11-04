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

## Mettre le wiki à jour

Une seule commande, depuis la tablette :

```bash
cd ~/wiki
bash deploy/termux/mettre-a-jour
```

Elle enchaîne : `git pull --ff-only`, application du correctif de contenu,
`npm install` **seulement si** `package-lock.json` a bougé, `npm run build`,
puis redémarrage et vérification que `/api/health` répond bien `200`.

Le script s'arrête **avant** de toucher au service si une étape échoue : le site
reste alors sur la version précédente, au lieu de redémarrer sur un `.next` à
moitié réécrit.

Deux options utiles :

```bash
bash deploy/termux/mettre-a-jour --sans-contenu   # code seul
bash deploy/termux/mettre-a-jour --sans-git       # ni pull ni install
```

### Pourquoi le contenu demande une étape à part

`data/` est exclu de Git : un `git pull` met le code à jour mais laisse les
articles intacts. Le seul mécanisme prévu est le bouton « Installer / mettre à
niveau » de `/admin` — or il **protège** les articles retouchés par la rédaction,
et il exige une connexion en Dauphin.

D'où `deploy/termux/appliquer-contenu.mjs`, qui applique un correctif daté :

```bash
node deploy/termux/appliquer-contenu.mjs --dry-run   # montre ce qui changerait
node deploy/termux/appliquer-contenu.mjs             # applique
```

Ses garanties : sauvegarde préalable dans `data/.sauvegardes/`, révision
`update` créée pour chaque article (l'instantané conserve l'**ancienne** version,
donc restaurable depuis `/wiki/<slug>/versions`), écriture atomique, et
**aucune création** — un article absent de la production n'est pas ressuscité.

### Le jeton DuckDNS n'est pas dans le dépôt

`deploy/termux/env.exemple` et le script de boot contiennent un **modèle**, pas
le jeton. Sur la tablette, le jeton vit à deux endroits seulement :

```bash
# Le service de rafraîchissement
grep DUCKDNS_TOKEN $PREFIX/var/service/duckdns/env

# Le démarrage au boot (script root)
printf 'DUCKDNS_TOKEN=%s\n' 'votre-jeton' > ~/.duckdns-token
chmod 600 ~/.duckdns-token
```

Sans `~/.duckdns-token`, le rafraîchissement au boot est simplement désactivé —
le reste du démarrage n'en dépend pas. Le dépôt étant **public**, un jeton
versionné permettrait à n'importe qui de repointer le sous-domaine.

## Sauvegarder le contenu

Si vous restez en stockage JSON, tout le wiki tient dans `data/` :

```bash
tar czf ~/sauvegarde-wiki-$(date +%F).tar.gz -C ~/wiki data
```

Si vous utilisez PostgreSQL, utilisez `pg_dump` — les fichiers JSON ne
contiendraient alors rien.

## Double authentification (A2F)

Les comptes d'édition sont protégés par un code à six chiffres envoyé en
**message privé Discord** par le bot du wiki.

### Configuration

Dans `~/wiki/.env.secrets` (jamais `.env` : Next y interprète les `$`) :

```bash
WIKI_2FA="eitam:1377681054550196295,esto:1467301113710514309+1470468669866774632"
WIKI_2FA_RECOVERY="scrypt\$…"
```

- les entrées sont séparées par des virgules, au format `compte:idDiscord` ;
- un compte peut porter plusieurs identifiants séparés par `+` : le code part
  vers tous, le premier qui aboutit suffit (cas d'Esto, qui a deux comptes) ;
- dès que `WIKI_2FA` est renseignée, **tous** les comptes de `WIKI_USERS`
  doivent y figurer. Un compte oublié se voit refuser la connexion : un oubli
  de configuration ne doit pas devenir une porte ouverte.

Le code de secours se génère haché :

```bash
node scripts/hash-password.mjs "votre code de secours"
```

Conservez le code en clair **hors du serveur** (gestionnaire de mots de passe).
Il sert quand Discord est injoignable ou que les MP du compte sont fermés.

### Ce qui est garanti

| Propriété | Mise en œuvre |
| --- | --- |
| Durée de vie | 5 minutes |
| Usage | unique — le défi est détruit après succès |
| Tentatives | 5 par défi, puis destruction |
| Stockage | empreinte HMAC liée au défi, jamais le code |
| Comparaison | temps constant |
| Rejeu | impossible : l'empreinte dépend du `challengeId` |

Vérification du moteur, sans navigateur :

```bash
npm run check:2fa
```

## Sauvegardes chiffrées

```bash
# Une fois : la phrase de passe, conservée AUSSI ailleurs
head -c 48 /dev/urandom | base64 > ~/.sauvegarde-cle
chmod 600 ~/.sauvegarde-cle

# Sauvegarde manuelle
bash deploy/termux/sauvegarde

# Contrôler la dernière archive
bash deploy/termux/sauvegarde --verifier
```

Chaque archive est **relue avant d'être publiée** : une sauvegarde non vérifiée
n'est qu'une promesse. La rotation conserve 14 archives.

Contenu : `data/`, `.env`, `.env.secrets`, `shared/`. Ni `node_modules/`, ni
`.next/` — reconstructibles.

### Planification

```bash
cp deploy/termux/run-sauvegarde $PREFIX/var/service/sauvegarde/run
chmod +x $PREFIX/var/service/sauvegarde/run
cp deploy/termux/env.exemple $PREFIX/var/service/sauvegarde/env
sv-enable sauvegarde
sv up sauvegarde
```

### Copie externe

Une sauvegarde sur la machine qu'elle protège ne protège de rien. Depuis le PC,
avec la tablette en USB :

```powershell
.\deploy\windows\recuperer-sauvegardes.ps1
```

Le script empaquette les archives sur la tablette, les rapatrie, les extrait
dans `%USERPROFILE%\Sauvegardes\WikiGratiennois`, puis nettoie le stockage
partagé. Planification quotidienne à 3 h :

```powershell
schtasks /Create /SC DAILY /ST 03:00 /TN "Sauvegarde wiki" ^
  /TR "powershell -ExecutionPolicy Bypass -File \"%CD%\deploy\windows\recuperer-sauvegardes.ps1\""
```

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

---

## 9. Deux domaines sur une seule tablette (installation réelle)

La tablette héberge **deux** sites, chacun sur son sous-domaine DuckDNS :

| Domaine | Service | Port local |
|---|---|---|
| `wiki-gratiennois.duckdns.org` | le wiki (Next.js) | 3000 |
| `syn-streaming.duckdns.org` | SYNHUB (déjà présent) | 3001 |

Un seul processus peut tenir les ports 80 et 443. C'est donc **Caddy qui les
prend**, et qui répartit selon le nom demandé. Le fichier correspondant est
[`Caddyfile.portier`](Caddyfile.portier) : il déclare les deux sites, lie
l'adresse `192.168.1.10` (Android occupe déjà `127.0.0.1:80` et `:443`) et
obtient les deux certificats par validation HTTP-01.

Le relais TLS propre à SYNHUB (`tools/https-proxy.mjs`) est donc **désactivé**
dans `/data/adb/service.d/syn-server.sh` : deux processus ne peuvent pas
écouter sur 443, et l'un des deux sites serait tombé au hasard. Le serveur
applicatif de SYNHUB, lui, n'a pas changé : il écoute toujours sur 3001. Une
sauvegarde du script d'origine est conservée en `syn-server.sh.avant-caddy`.

### Pourquoi les identifiants ne sont pas dans `.env`

Next.js relit `.env` à son démarrage et y interprète les `$` comme des
références de variables. Une empreinte scrypt (`scrypt$sel$empreinte`) y perd
ses deux séparateurs ; `startsWith("scrypt$")` devient faux, la vérification
retombe sur une comparaison en clair, et **la connexion échoue toujours** avec
« Identifiants incorrects » alors que le mot de passe est bon.

Les comptes vivent donc dans **`.env.secrets`**, que `run-wiki` exporte après
`.env` et que Next ne connaît pas :

```bash
# ~/wiki/.env.secrets  (chmod 600)
WIKI_USERS='esto:scrypt$sel$empreinte:dauphin'
```

Le symptôme se reconnaît à un détail : un mot de passe **sans `$`** fonctionne,
un mot de passe qui en contient un échoue. C'est ce qui a permis de trancher.

### Le démarrage au boot

`termux-services` n'est pas nécessaire ici : la tablette est rootée, et
KernelSU exécute les scripts de `/data/adb/service.d/` au démarrage du système,
sans qu'il faille ouvrir Termux.

```bash
cp deploy/termux/boot-wiki-gratiennois.sh /data/adb/service.d/wiki-gratiennois.sh
chmod 755 /data/adb/service.d/wiki-gratiennois.sh
```

Il surveille le wiki, le bot, Caddy et l'enregistrement DuckDNS. Les journaux
sont dans `~/wiki-service.log`, `~/bot-service.log` et
`/data/adb/caddy/logs/service.log`.

> Sur Android, `su -c` s'exécute dans un espace de noms où `/data/adb` n'est pas
> accessible en écriture. Pour modifier un script de démarrage, utilisez
> `su -M -c` (« mount master »), sans quoi la copie échoue en « permission
> denied » alors que les droits affichés semblent corrects.

### HTTPS forcé, sur trois niveaux

Rediriger le port 80 ne suffit pas : tant que le serveur applicatif écoute sur
`0.0.0.0`, le site reste consultable en clair sur `http://<ip>:3000` depuis le
réseau local, et le HTTPS devient décoratif.

| Niveau | Moyen | Effet |
|---|---|---|
| Réseau | `next start --hostname 127.0.0.1` | le wiki n'écoute plus que pour Caddy ; l'accès direct en clair est refusé |
| Portier | HTTPS automatique de Caddy | toute requête sur le port 80 repart en `308` vers `https://` |
| Navigateur | `Strict-Transport-Security` | après la première visite, le navigateur refuse lui-même le clair |

Deux détails qui comptent :

- **`header_down -Strict-Transport-Security`** dans chaque `reverse_proxy` :
  l'application pose son propre HSTS, et sans cette ligne la réponse en porterait
  deux. C'est celui du portier qui fait foi.
- **Ne pas écrire de bloc `http://` explicite** pour la redirection : Caddy la
  crée seul dès qu'un domaine figure dans le fichier, et un bloc manuel
  entrerait en concurrence avec le défi ACME du renouvellement de certificat.

SYNHUB fait exception assumée : il reste joignable en clair sur le port 3001
depuis le réseau local, parce que son code affiche lui-même ces adresses pour la
TV et le téléphone. Le fermer casserait cet usage. Ses visiteurs passent par
`https://syn-streaming.duckdns.org`, où le HTTPS est bien forcé.


