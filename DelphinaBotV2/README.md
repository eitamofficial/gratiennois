# DelphinaBot V2

Le bot Discord du **IIIe Delphinat de Gratianopolis** : 85 commandes en
français, la liaison avec le wiki, la modération, les niveaux, l'économie, le
divertissement et la musique.

Écrit pour **discord.js 14** et **Node.js 20 ou plus récent**. Aucune base de
données à installer : les données vivent dans `data/delphinabot.json`, écrit de
façon atomique, et les binaires lourds (FFmpeg) viennent des dépendances npm.

---

## 1. Installation

```bash
cd DelphinaBotV2
npm install
```

`npm install` récupère discord.js, la couche vocale, FFmpeg (binaire statique),
l'encodeur Opus et la bibliothèque de chiffrement du vocal. Il reste **un**
binaire extérieur à poser : `yt-dlp`.

| Ce qu'il faut | Où le mettre | Dépendance npm équivalente |
|---|---|---|
| `yt-dlp` | `DelphinaBotV2/bin/yt-dlp.exe` (Windows) ou `bin/yt-dlp`, **ou dans le `PATH`** | aucune — [télécharger](https://github.com/yt-dlp/yt-dlp/releases) |
| `ffmpeg` | fourni par `ffmpeg-static` | `ffmpeg-static` |
| `opus` | fourni par `opusscript` | `opusscript` |
| chiffrement du vocal | fourni par `libsodium-wrappers` | `libsodium-wrappers` |
| chiffrement de bout en bout (DAVE) | apporté par la couche vocale 0.19 et plus | `@snazzah/davey` |

Sans `yt-dlp`, le bot démarre et le dit dans son journal : toutes les commandes
fonctionnent **sauf la musique**, qui refuse alors explicitement au lieu
d'échouer en silence.

Le bot cherche ses deux outils dans cet ordre : le chemin du `.env`, puis
`DelphinaBotV2/bin/`, puis le `PATH`. Ce dernier point est ce qui rend
l'installation possible sur une tablette Android : `pkg install ffmpeg yt-dlp`
suffit alors, sans recopier le moindre binaire.

> **Sur une tablette Android (Termux)** — installation, service qui survit à
> l'écran éteint, module natif du vocal, dépannage : voir
> [`deploy/termux/LISEZ-MOI-bot.md`](../deploy/termux/LISEZ-MOI-bot.md).

> **Le vocal de Discord exige deux choses que la couche vocale n'installe pas
> seule.** Une bibliothèque de chiffrement (`libsodium-wrappers`, déclarée par ce
dépôt) et le protocole **DAVE**, le chiffrement de bout en bout désormais imposé
aux salons vocaux, apporté par `@discordjs/voice` à partir de la version 0.19.
> Avec la 0.18, la connexion au salon s'ouvre puis Discord la referme aussitôt :
toutes les commandes de musique répondent « salon vocal inaccessible » alors que
yt-dlp, FFmpeg et les permissions sont en place. Le bot contrôle ces deux points
au démarrage et le dit dans son journal.

## 2. Configuration

```bash
cp .env.example .env
```

Deux variables sont **indispensables** — le bot refuse de démarrer sans elles,
avec un message clair plutôt qu'une boucle d'erreurs :

| Variable | Rôle |
|---|---|
| `DISCORD_BOT_TOKEN` | jeton du bot, page *Bot* du portail développeur |
| `DISCORD_GUILD_ID` | identifiant du serveur où le bot travaille |

Puis, pour la liaison avec le wiki :

| Variable | Rôle |
|---|---|
| `WIKI_URL` | adresse publique du wiki, sans barre finale |
| `BOT_SYNC_SECRET` | **le même** secret que dans le `.env` du wiki |
| `DISCORD_CLIENT_ID` | pour le lien d'invitation et l'enregistrement des commandes |

Le reste (durée maximale d'un morceau, volume, palier d'expérience, clés
facultatives Spotify, Genius, Last.fm) est facultatif et documenté dans
`.env.example`.

**Deux intents privilégiés doivent être activés** sur la page *Bot* du portail
développeur Discord, sinon la connexion est refusée :

- **Server Members Intent** — sans lui, ni arrivées, ni rôles, ni rattachement
  au wiki ;
- **Message Content Intent** — sans lui, ni expérience, ni épingle, ni lecture
  des messages.

La propagation d'une modification d'intent peut prendre jusqu'à une heure.

## 3. Démarrage

```bash
npm run commandes          # enregistre les 84 commandes sur le serveur
npm start                  # démarre le bot
```

`npm run commandes` écrit la portée visée, **puis** efface la portée opposée
(les commandes globales si le bot travaille dans un serveur) : sans cet
effacement, une commande publiée par une version précédente resterait affichée
en doublon, Discord considérant la version globale et la version de serveur comme
deux commandes distinctes. L'ordre compte : effacer d'abord et échouer ensuite
laisserait le serveur sans aucune commande.

Une portée **déjà à jour n'est pas réécrite** (noms, descriptions et options
sont comparés à ce que Discord détient) : relancer la commande pour rien ne
consomme aucune création. Le script relit ce que Discord a réellement gardé et
l'écrit dans le journal.

> **Ne redéployez pas en boucle.** Discord limite une application à **200
> créations de commandes par jour**, tous périmètres confondus : chaque écriture
> consomme autant de créations qu'elle envoie de commandes. Quand la limite est
> atteinte, Discord répond `429`, l'écriture est refusée et le script le dit
> franchement. Il bascule alors sur une **publication globale** (portée « tous
> les serveurs ») plutôt que de laisser le bot sans commande — avec jusqu'à une
> heure de propagation, et sans réécrire les commandes globales si elles sont
déjà identiques. Le lendemain, un `npm run commandes` normal restaure la portée
de serveur.

> **Une seule instance à la fois.** Le bot pose un verrou en démarrant
> (`data/delphinabot.verrou`, qui retient son PID) : un second démarrage est
> refusé avec un message explicite plutôt que de laisser deux bots se disputer
> les mêmes interactions — Discord n'en accepte qu'une par commande, et l'autre
> journalise « Unknown interaction ». Un verrou laissé par un arrêt brutal est
> repris automatiquement.

Autres scripts :

| Script | Ce qu'il fait |
|---|---|
| `npm run commandes:verifier` | contrôle hors ligne : noms, descriptions, doublons, options |
| `npm run musique:verifier` | contrôle de la musique : file d'attente, panneau, flux réel (interroge YouTube) |
| `npm start` | démarre le bot (journal horodaté sur la sortie standard) |

## 4. Inviter le bot

Le rôle du bot ne doit **pas** porter `Administrateur` : cette permission
contourne toutes les permissions de salon et masque les erreurs du bot
lui-même. Le masque à utiliser est **`1099938786310`** :

`Manage Roles`, `Manage Messages`, `Kick Members`, `Ban Members`,
`Moderate Members`, `Mute Members`, `Move Members`, `Manage Nicknames`,
`Manage Channels`, `View Channel`, `Send Messages`, `Embed Links`,
`Attach Files`, `Read Message History`, `Connect`, `Speak`,
`Use External Emoji`.

`/invite` construit le lien d'invitation avec exactement ce masque.

## 5. La liaison avec le wiki

Le bot **n'écrit jamais** d'article. Il signale au wiki des changements de
rôles et de pseudonymes ; c'est le wiki qui décide quoi en faire. Le secret
partagé ne sert qu'à authentifier ces signaux — il n'accorde aucun droit
d'écriture sur le contenu.

La signature est un **HMAC-SHA256** de `horodatage.corps`, envoyé dans les
en-têtes `x-wiki-signature` et `x-wiki-timestamp`. Le wiki rejoue le même calcul
et rejette ce qui ne correspond pas : un tiers qui intercepte un appel ne peut
ni le rejouer (l'horodatage change) ni le modifier (la signature change). Un
corps non signé reçoit un **401**.

Trois chemins mènent au wiki :

| Chemin | Quand |
|---|---|
| **automatique** | à l'arrivée d'un membre et à chaque changement de rôles ou de pseudonyme — le rattachement part seul, sans commande |
| `/valider-lien` | pour transmettre le rattachement d'un membre précis, à la demande |
| `/synchroniser` | pour rattacher d'un coup tous les membres reconnus, par lots de vingt |

Ce qui décide du rattachement est `shared/roster.json`, **le même fichier que
lit le wiki** : un rôle Discord qui désigne un personnage, ou un pseudonyme qui
correspond à son nom ou à l'un de ses alias. Modifier ce fichier modifie le
comportement du bot au redémarrage suivant — aucun code à toucher.

Conseils d'usage :

- `/lien membre:@…` montre ce que le bot **déduirait**, sans rien envoyer ;
  c'est le contrôle à faire avant de transmettre ;
- `/synchroniser simulation:true` montre ce qui partirait, sans rien envoyer ;
- `/wiki-etat` vérifie que le wiki répond (`/api/health`) et rappelle l'état de
  la configuration partagée.

Sans `BOT_SYNC_SECRET`, le bot fonctionne : il le dit simplement au démarrage, et
le reste de ses fonctions demeure intact.

## 6. Les commandes

85 commandes, toutes en slash. `/aide` en affiche la liste complète, `/aide
commande:` détaille une commande précise.

### Système (7)
- `/ping` — Vérifie que le bot répond et mesure sa latence.
- `/aide` — Liste les commandes disponibles.
- `/botinfo` — État technique du bot.
- `/invite` — Liens d'invitation du bot et du serveur.
- `/support` — Où demander de l'aide et signaler un problème.
- `/statistiques` — Affiche les chiffres du serveur et du bot.
- `/journal` — Montre où le bot écrit ses traces.

### Wiki (6)
- `/wiki` — Cherche un article du wiki.
- `/page` — Affiche la fiche d'un article à partir de son adresse.
- `/lien` — Montre à quelle fiche du wiki un membre correspond.
- `/valider-lien` — Transmet au wiki le rattachement d'un membre.
- `/synchroniser` — Rattache au wiki tous les membres reconnus.
- `/wiki-etat` — État de la liaison entre le bot et le wiki.

### Modération (14)
- `/bannir` — Bannit un membre du serveur.
- `/exclure` — Expulse un membre du serveur.
- `/purger` — Supprime des messages dans le salon courant.
- `/avertir` — Avertit un membre (et conserve la trace).
- `/avertissements` — Liste les avertissements d'un membre.
- `/retirer-avertissement` — Retire un avertissement par son identifiant.
- `/delai` — Rend un membre muet pendant une durée.
- `/sourdine` — Retire la parole à un membre jusqu'à levée manuelle.
- `/debannir` — Révoque un bannissement.
- `/revoquer` — Lève les sanctions d'un membre.
- `/deplacer` — Déplace un ou plusieurs membres vers votre salon vocal.
- `/signaler` — Signale un membre à la modération.
- `/signalements` — Liste les signalements du serveur.
- `/resoudre-signalement` — Clôt un signalement.

### Sécurité (6)
- `/verrouiller` — Ferme un salon à l'écriture.
- `/deverrouiller` — Rouvre un salon fermé.
- `/ralentir` — Règle le mode lent du salon.
- `/audit` — Passe le serveur au crible et liste ce qui mérite un regard.
- `/alertes` — Affiche les alertes récentes du bot.
- `/historique` — Montre le passé de modération d'un membre.

### Niveaux (3)
- `/niveau` — Affiche le niveau et l'expérience d'un membre.
- `/classement` — Affiche les membres les plus actifs.
- `/xp` — Modifie l'expérience d'un membre.

### Économie (11)
- `/solde` — Affiche la fortune d'un membre.
- `/classement-ducats` — Affiche les plus grosses fortunes du serveur.
- `/travailler` — Gagne des ducats en travaillant.
- `/recompense` — Réclame la prime quotidienne du Delphinat.
- `/epargner` — Met des ducats de côté, à l'abri.
- `/retirer-epargne` — Retire des ducats de l'épargne.
- `/transferer` — Transfère des ducats à un autre membre.
- `/donner` — Crédite un membre (administration).
- `/taxer` — Prélève des ducats à un membre (administration).
- `/boutique` — Affiche les articles de la boutique.
- `/acheter` — Achète un article de la boutique.

### Configuration (3)
- `/configurer` — Règle le bot pour ce serveur.
- `/bienvenue` — Règle l'accueil des nouveaux membres.
- `/simuler` — Affiche les messages d'accueil tels quels.

### Utilitaires (8)
- `/avatar` — Affiche la photo de profil d'un membre.
- `/utilisateur` — Affiche la fiche d'un membre du serveur.
- `/serveur` — Affiche les informations du serveur.
- `/meteo` — Donne la météo d'une ville.
- `/maths` — Calcule une expression.
- `/sondage` — Crée un sondage à réactions.
- `/dire` — Fait parler le bot dans un salon.
- `/lmgtfy` — Génère un lien de recherche pour une question.

### Fun (9)
- `/de` — Lance un ou plusieurs dés.
- `/pile-ou-face` — Tire à pile ou face.
- `/choisir` — Départage plusieurs propositions.
- `/reponse` — Donne la réponse de la dernière question de quiz.
- `/citation` — Affiche une citation du Delphinat.
- `/decret` — Fait publier un décret absurde au bot.
- `/quiz` — Pose une question de culture gratiennoise.
- `/calin` — Envoie un câlin à un membre.
- `/bisous` — Envoie un bisou à un membre.

### Musique (15)
- `/jouer` — Joue un morceau ou l'ajoute à la file.
- `/pause` — Met la lecture en pause.
- `/reprendre` — Reprend la lecture.
- `/suivant` — Passe au morceau suivant.
- `/arreter` — Arrête la lecture et quitte le salon vocal.
- `/file` — Affiche la file d'attente.
- `/retirer` — Retire un morceau de la file.
- `/deplacer-morceau` — Met un morceau de la file en tête.
- `/volume` — Règle le volume de la lecture.
- `/boucle` — Règle la répétition.
- `/melanger` — Mélange la file d'attente.
- `/en-cours` — Affiche le morceau en cours.
- `/panneau` — Affiche ici le panneau de contrôle de la musique.
- `/paroles` — Cherche les paroles d'un morceau.
- `/lastfm` — Affiche les écoutes Last.fm d'un compte.

**La musique ne s'arrête plus toute seule.** Le morceau est diffusé en continu :
le bot demande à `yt-dlp` d'écrire l'audio sur sa sortie standard, et FFmpeg le
transcode en direct. Diffuser l'URL extraite — l'ancienne méthode — obligeait à
réutiliser une adresse qui expire et que YouTube refuse volontiers une fois la
lecture commencée. Quatre protections s'ajoutent :

| Réglage | Ce qu'il empêche |
|---|---|
| `TOLERANCE_SILENCE_IMAGES` (50) | que 100 ms de réseau capricieux suffisent à abandonner le flux — c'était la cause principale des arrêts |
| `TENTATIVES_MUSIQUE` (2) | qu'un morceau coupé en route soit perdu : il est repris, par une seconde méthode indépendante |
| `DELAI_QUITTER_VOCAL_SECONDES` (300) | que le bot disparaisse du salon dès la dernière note — le temps d'ajouter un morceau |
| — | que la perte de connexion vocale coûte la séance : le bot attend la reconnexion et reprend le morceau, au lieu de tout ranger |

Un **panneau de contrôle** apparaît avec le premier morceau joué : barre de
progression, file à venir et quatre boutons — pause, suivant, répétition, arrêt.
Il suit la lecture toute seule, se réécrit sans être reposté, et perd ses boutons
quand la séance se termine. `/panneau` sert à le déplacer dans un autre salon ;
seuls les membres présents dans le salon vocal peuvent s'en servir.

### Interaction (3)
- `/concours` — Lance un concours avec un bouton de participation.
- `/regles` — Publie le règlement du serveur dans un salon.
- `/tirage` — Tire un ou plusieurs noms au sort dans le salon.

## 7. Comment c'est construit

```
DelphinaBotV2/
├── index.js                    point d'entrée : configuration, stockage, connexion
├── bin/yt-dlp.exe              recherche et extraction audio
├── ressources/                 citations, décrets, boutique, quiz (fichiers éditables)
├── data/delphinabot.json       réglages, niveaux, ducats, avertissements, liens
└── src/
    ├── config.js               lecture et validation de l'environnement
    ├── dependances.js          présence de yt-dlp et FFmpeg, signalée au démarrage
    ├── logger.js               journal horodaté, filtré par niveau
    ├── stockage.js             écriture atomique, valeurs par défaut, économie
    ├── wiki.js                 recherche, signature HMAC, rattachement
    ├── niveaux.js              courbe d'expérience (forme fermée, pas de boucle)
    ├── evenements.js           arrivées, départs, rôles, messages, interactions
    ├── deployer.js             enregistrement des commandes
    ├── verifier-commandes.js   contrôle hors ligne des commandes
    ├── verifier-musique.js     contrôle de la musique (file, panneau, flux réel)
    ├── commandes/              une commande = un objet { nom, resume, donnees, executer }
    ├── lib/                    embeds, durées, texte, ressources
    └── musique/                lecteur vocal, sources (Spotify/Deezer), paroles, Last.fm
                                + panneau.js : l'affichage « en cours » et ses boutons
```

Trois principes tiennent l'ensemble :

1. **Une erreur destinée au membre est une erreur typée.** `ErreurUtilisateur`
   est affichée telle quelle ; toute autre devient « une erreur inattendue est
   survenue » et part dans le journal. Un membre ne voit jamais une trace de
   pile.
2. **Ce qui manque est dit au démarrage.** Sans clé Last.fm, la commande
   correspondante l'explique ; sans `yt-dlp`, le journal le signale ; sans
   salon de journal configuré, les sanctions le rappellent. Rien n'échoue en
   silence.
3. **Le registre n'est jamais importé par une commande.** Les commandes
   reçoivent le contexte ; cela évite un cycle d'import qui casserait
   l'initialisation dès que le premier module chargé n'est pas le registre.

## 8. Dépannage

| Symptôme | Cause probable |
|---|---|
| `Used disallowed intents` | intents privilégiés non activés sur le portail développeur |
| `Variables manquantes` | `DISCORD_BOT_TOKEN` ou `DISCORD_GUILD_ID` absents du `.env` |
| Les commandes n'apparaissent pas | `npm run commandes` n'a pas été lancé, ou le bot a été invité sans la portée `applications.commands` |
| `npm run commandes` affiche `429` | limite des 200 créations du jour atteinte : publication globale de secours, ou nouvel essai le lendemain |
| `/jouer` refuse | `yt-dlp` absent, ou FFmpeg introuvable (`npm install` incomplet) |
| La musique s'arrête au milieu d'un morceau | `yt-dlp` ancien (le flux est refusé en route) : `yt-dlp -U`. Le journal écrit « interrompu après … — reprise 1/2 » quand le bot a repris seul |
| Le bot quitte le salon dès la fin de la file | c'est le délai normal : `DELAI_QUITTER_VOCAL_SECONDES` (300 s par défaut, 0 pour partir aussitôt) |
| Les boutons du panneau ne répondent pas | il faut être dans le salon vocal de la lecture, ou être modérateur |
| `/panneau` n'existe pas dans Discord | commande ajoutée depuis le dernier déploiement : `npm run commandes` |
| Un doute sur la musique | `npm run musique:verifier` : il joue un morceau pour de bon et vérifie la reprise |
| Le wiki refuse (401) | `BOT_SYNC_SECRET` diffère d'un côté ou de l'autre |
| Rien n'est rattaché au wiki | aucun rôle ni pseudonyme ne correspond à `shared/roster.json` — vérifiez avec `/lien` |

Le journal est la sortie standard : redirigez-la pour la conserver.

```bash
npm start > bot.log 2>&1
```
