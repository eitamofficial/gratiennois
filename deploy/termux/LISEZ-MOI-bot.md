# Faire tourner DelphinaBot V2 sur une tablette Android (Termux)

Ce guide met le bot Discord en service sur une tablette ou un téléphone rooté,
à côté du wiki (voir [`LISEZ-MOI.md`](LISEZ-MOI.md)). Le bot est autonome : il
n'a besoin ni du wiki ni de Caddy pour répondre, seulement du réseau et du
**port 443 sortant** vers Discord.

**Ce que cet hébergement donne, et ce qu'il ne donne pas.** Le bot sera en ligne
tant que la tablette est allumée, connectée, et qu'Android ne suspend pas
Termux. Il n'y a ni reprise sur panne, ni supervision externe : si la tablette
perd le réseau une heure, la musique s'arrête pendant cette heure. C'est un
hébergement de proximité, pas un hébergement de production.

---

## 1. En une commande

Depuis le dépôt cloné sur la tablette :

```bash
bash deploy/termux/installer-delphinabot
```

Le script installe `nodejs-lts`, `python`, `ffmpeg`, `termux-services` et
`termux-tools`, installe ou met à jour `yt-dlp` par `pip`, prend les dépendances
npm, **vérifie que le bot peut réellement tourner sur cette machine**, crée le
service `delphinabot` et l'active. Il ne demande aucun droit administrateur et
ne touche à rien hors de Termux.

Il est idempotent : le relancer ne casse rien. C'est aussi la commande à lancer
après une mise à jour du dépôt.

> **Pourquoi `ffmpeg` du système, alors que le projet embarque `ffmpeg-static` ?**
> Le binaire de cette dépendance est compilé pour GNU/Linux. Android utilise
> bionic : il ne s'exécute pas. Le bot le cherche donc **dans le `PATH` quand le
> binaire embarqué n'existe pas**, et `pkg install ffmpeg` suffit. Il en va de
> même de `yt-dlp`, plus simple à tenir à jour par `pip`.

## 2. Le `.env` de la tablette

L'installateur crée un `.env` vide à partir du modèle s'il n'en existe pas.
Trois lignes comptent vraiment :

```
DISCORD_BOT_TOKEN=…           # jeton du bot
DISCORD_GUILD_ID=…            # serveur où il travaille
WIKI_URL=http://127.0.0.1:3000   # le wiki de la tablette, en local
```

`WIKI_URL` en `http://127.0.0.1:3000` est volontaire : la synchronisation des
rôles reste à l'intérieur de la machine, elle ne dépend ni du sous-domaine
DuckDNS ni du certificat de Caddy, et elle continue de fonctionner même si le
port 80 de la box n'est pas redirigé. `BOT_SYNC_SECRET` doit être **identique**
à celui du `.env` du wiki.

**Ne renseignez ni `CHEMIN_YTDLP` ni `CHEMIN_FFMPEG`** : laissés vides, le bot
les trouve seul dans `$PREFIX/bin`. Les renseigner à la main, c'est devoir y
revenir à chaque mise à jour de `yt-dlp`.

Les réglages qui concernent la tablette :

| Variable | Sur une tablette |
|---|---|
| `DELAI_QUITTER_VOCAL_SECONDES` | 300 par défaut. Le temps laissé à la file vide avant de quitter le salon ; 0 pour partir aussitôt. |
| `TENTATIVES_MUSIQUE` | 2 par défaut. Reprises d'un morceau coupé avant de passer au suivant ; 0 pour ne jamais reprendre. |
| `TOLERANCE_SILENCE_IMAGES` | 50 par défaut. Une seconde de blanc tolérée avant d'abandonner un flux. **Ne descendez pas** : c'est ce qui empêche la musique de s'arrêter toute seule sur un réseau mobile. |
| `VOLUME_DEFAUT` | 40 par défaut. |
| `NIVEAU_LOG` | `info`. Passez `debug` pour comprendre un problème ponctuel, puis revenez à `info`. |

## 3. Enregistrer les commandes, puis démarrer

```bash
cd ~/wiki/DelphinaBotV2
npm run commandes        # une fois, et après chaque mise à jour du dépôt
sv up delphinabot        # démarre le service
```

`npm run commandes` ne réécrit pas une portée déjà à jour : le relancer pour
rien ne consomme aucune des 200 créations de commandes autorisées par jour.

Le service `delphinabot` est géré par `termux-services`. Il pose lui-même le
verrou d'écran et relance le bot après un arrêt.

```bash
sv status delphinabot              # tourne-t-il ?
sv down delphinabot                # l'arrêter proprement
sv up delphinabot                  # le relancer
tail -f $PREFIX/var/service/delphinabot/log/x    # le journal
```

Le journal du bot et celui du service sont complémentaires : celui du service
porte les relances et le verrou d'écran, celui du bot tout le reste.

## 4. Survivre à Android

Android suspend les applications en arrière-plan dès que l'écran s'éteint, ce
qui coupe la connexion vocale en pleine écoute. Trois mesures, dans cet ordre :

```bash
termux-wake-lock        # le service le fait à chaque démarrage
```

Puis, dans les réglages Android de la tablette : **Applications → Termux →
Batterie → Sans restriction**, et **autoris à démarrer au démarrage**.

Sur une tablette rootée, le réglage devient permanent :

```bash
su -c "dumpsys deviceidle whitelist +com.termux"
```

Pour démarrer les services à l'allumage :

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-delphinabot <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
sv up delphinabot
EOF
chmod +x ~/.termux/boot/start-delphinabot
```

## 5. La musique, ce qui la fait tenir

Le vocal de Discord exige deux choses que la couche vocale n'installe pas
seule : une bibliothèque de chiffrement (`libsodium-wrappers`, du WebAssembly,
rien à compiler) et le protocole **DAVE**, le chiffrement de bout en bout
imposé aux salons vocaux. Sur Android, DAVE s'appuie sur un module **natif**,
fourni par un paquet propre à l'architecture (`@snazzah/davey-android-arm64`).
Trois conséquences :

- l'installateur supprime `node_modules/@snazzah` avant `npm install`, pour
  qu'une variante compilée pour une autre machine ne soit jamais conservée :
  un module natif de la mauvaise architecture est pire qu'absent, il se charge
  puis échoue au premier appel ;
- si vous changez d'architecture (une tablette arm64, un téléphone armv7), il
  faut refaire `npm install` sur place ;
- le bot contrôle ces deux points **au démarrage** et le dit dans son journal,
  au lieu de laisser découvrir un silence au premier `/jouer`.

Le morceau est diffusé en continu : le bot demande à `yt-dlp` d'écrire l'audio
sur sa sortie standard et FFmpeg le transcode en direct. Aucune URL n'est
réutilisée après coup, aucune piste n'est téléchargée en entier, et couper la
lecture tue le processus `yt-dlp` — sur une tablette, c'est de la batterie
gagnée. Le prix : YouTube modifie son service souvent, donc gardez `yt-dlp` à
jour (`pip install -U yt-dlp`) si des morceaux se mettent à échouer.

## 6. Vérifier que tout fonctionne

```bash
cd ~/wiki/DelphinaBotV2

# Le bot voit-il ses dépendances ?
node --input-type=module -e "
  import { lireConfiguration, avertissements } from './src/config.js';
  import { verifierDependances } from './src/dependances.js';
  const c = lireConfiguration();
  console.log('yt-dlp :', c.chemins.ytdlp);
  console.log('ffmpeg :', c.chemins.ffmpeg);
  for (const r of [...avertissements(c), ...verifierDependances(c)]) console.log('[à corriger]', r);
"

# La musique tient-elle ? Elle lance un morceau pour de bon (exit 0 attendu).
npm run musique:verifier

# Les 85 commandes sont-elles cohérentes ?  (exit 0 attendu)
npm run commandes:verifier
```

`musique:verifier` interroge réellement YouTube : ses sections 4 et 5 dépendent
du réseau. Un refus de YouTube y est compté « non vérifié », jamais comme un
defaut du bot — c'est justement l'incident que la reprise couvre, et la section
5 le met à l'épreuve en cassant volontairement le chemin de `yt-dlp`.

Puis, dans Discord : `/jouer` sur un titre, et le panneau de contrôle doit
apparaître dans le salon, avec la barre de progression et ses boutons. La
commande `/panneau` existe depuis peu : `npm run commandes` doit avoir été
relancé pour qu'elle apparaisse.

## 7. Dépannage

**« yt-dlp est introuvable »** — `pip install -U yt-dlp`, puis `sv restart
delphinabot`. Le chemin retenu est écrit dans le journal au démarrage.

**La musique s'arrête au bout de quelques secondes** — trois causes possibles,
dans l'ordre : `yt-dlp` trop ancien (le flux est refusé en cours de route),
Android qui suspend Termux (section 4), ou une tolérance de silence descendue
sous 50 images dans le `.env`. Le journal du bot le dit : `Musique (…) :
« titre » interrompu après … — reprise 1/2`.

**« salon vocal inaccessible »** alors que les permissions sont bonnes — le
chiffrement manque. Vérifiez que `npm install` a bien été lancé **sur la
tablette**, puis relancez-le après avoir supprimé `node_modules/@snazzah`.

**« Une autre instance de DelphinaBot tourne déjà »** — le verrou
`DelphinaBotV2/data/delphinabot.verrou` désigne un processus vivant. Si c'est un
reste d'un arrêt brutal, supprimez le fichier et relancez. Sous Termux, cela
arrive quand le service et un `npm start` lancé à la main se croisent : arrêtez
le service (`sv down delphinabot`) avant de lancer le bot en direct.

**Le bot répond puis devient muet au bout d'un moment** — le Wi-Fi de la
tablette s'est mis en veille. « Applications → Termux → Batterie → Sans
restriction » n'est pas facultatif pour un bot vocal.

**Les commandes n'apparaissent pas dans Discord** — `npm run commandes` n'a pas
été relancé depuis l'ajout de `/panneau`, ou Discord n'a pas encore propagé la
portée globale (jusqu'à une heure). Le journal du déploiement dit laquelle des
deux portées a été écrite.
