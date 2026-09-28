# DelphinaBot

Bot Discord du **IIIe Delphinat de Gratianopolis**. Entièrement francophone,
il tient en un seul processus et une seule base de données :

| Module | Ce qu'il fait |
| --- | --- |
| **Sécurité** | Configuration par serveur, audit des permissions, détection d'usurpation de nom, liens de rôles vérifiés avec le wiki |
| **Modération** | Avertissement, délai, sourdine, exclusion, bannissement, Révocation, purge, ralentissement, signalements, dossier de sanctions |
| **Anti-raid** | Détection d'une arrivée massive, verrouillage du serveur, quarantaine, alerte dans un salon dédié |
| **Divertissement** | Quiz jouable, dés, citations, décrets, tirages, niveaux et classement |
| **Économie** | Ducats, métier, récompense quotidienne, épargne, transferts, marché, taxation |
| **Musique** | Lecture dans les salons vocaux, file d'attente, volume, boucle (yt-dlp + FFmpeg) |
| **Système** | `/aide` lue dans la liste réelle des commandes, `/journal`, synchronisation signée avec le wiki |

## Ce que le bot ne fait pas

Ces refus sont délibérés, et c'est ce qui rend le bot estimable :

- il **n'écrit jamais d'article**. Il signale au wiki des changements de rôles,
  et c'est le wiki qui décide quoi en faire ;
- il **n'exclut ni ne banni jamais seul**, même quand la détection de flood le
  decide. L'escalade au-delà de trois sanctions est une *alerte*, pas une
  décision ;
- il ne lit pas les messages privés et ne mémorise aucun contenu : seuls un
  identifiant, un motif et un extrait de 400 caractères sont conservés ;
- il n'envoie rien sur Discord sans qu'un membre l'ait demandé nommément.

## Installation

### 1. Node.js et la base

Node doit être installé **pour tout le système** (par défaut dans
`C:\Program Files\nodejs`), pas via un gestionnaire de versions : la tâche
planifiée tourne sous `SYSTEM`, dont l'environnement est distinct du vôtre.

```bash
cd delphinabot
npm install
```

### 2. La base de données

DelphinaBot partage la base PostgreSQL du wiki. Toutes ses tables sont
préfixées `delphinabot_` et il n'écrit jamais dans une table du site. Le
schéma est créé au démarrage ; pour le créer et l'éprouver tout de suite :

```bash
npm run build
npm run essai
```

`npm run essai` crée le schéma, exerce chaque dépôt sur un serveur fictif,
puis supprime tout ce qu'il a écrit.

### 3. Le fichier `.env`

Copiez `.env.example` en `.env` et renseignez au minimum :

| Variable | Rôle |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Jeton du bot, jamais versionné |
| `DISCORD_CLIENT_ID` | Identifiant de l'application |
| `DATABASE_URL` | Base PostgreSQL partagée avec le wiki |
| `DISCORD_GUILD_ID` | Serveur de référence (déploiement instantané des commandes) |

Les autres variables ont des valeurs par défaut raisonnables et sont
documentées dans `.env.example`.

### 4. Le portail développeur

Sur <https://discord.com/developers/applications> :

1. **General Information** — copiez l'identifiant dans `DISCORD_CLIENT_ID`.
2. **Bot** — `Reset Token`, puis copiez le jeton dans `DISCORD_BOT_TOKEN`.
3. **Bot > Privileged Gateway Intents** — activez **MESSAGE CONTENT** et
   **SERVER MEMBERS INTENT**. Sans eux, le bot ne voit ni le texte des
   messages ni les nouveaux membres, et la moitié de ses modules tombent.
4. **OAuth2 > URL Generator** — cochez `bot` et `applications.commands`,
   puis les permissions : `Manage Roles`, `Manage Messages`, `Kick Members`,
   `Ban Members`, `Moderate Members`, `Mute Members`, `Move Members`,
   `Manage Nicknames`, `View Channel`, `Send Messages`, `Embed Links`,
   `Attach Files`, `Connect`, `Speak`, `Use External Emoji`, `Read Message
   History`. Invitez le bot avec l'adresse obtenue.
5. **Bot > Interactions > Endpoint d'intérations** — laissez le champ vide
   si le bot est connecté en permanence. Il ne sert qu'à un bot qui reçoit
   des interactions par HTTPS sans connexion permanente.
6. **General Information > Vérification des liens de rôles** — l'adresse à
   donner aux membres pour rattacher leur compte Discord à une page du wiki
   est celle du wiki : `https://wiki-gratiennois.duckdns.org/bot`.
7. **General Information > Terms of Service / Privacy Policy** — les pages
   `/bot/conditions` et `/bot/confidentialite` du wiki.

Les quatre adresses demandées par le portail sont réunies sur la page
`/bot` du wiki, qui est la référence publique à copier.

### 5. Les commandes

```bash
npm run commandes:verifier   # contrôle la conformité avant envoi
npm run commandes            # publie les commandes
npm start                    # démarre le bot
```

Avec `DISCORD_GUILD_ID` renseigné, les commandes apparaissent immédiatement
dans ce serveur. Sans lui, elles sont publiées globalement et Discord peut
mettre jusqu'à une heure à les propager.

### 6. Les salons et les rôles

Sur le serveur, en tant qu'administrateur :

```
/configurer salons alertes    #channel #alertes
/configurer roles  moderation @Moderation
/configurer roles  quarantaine @Quarantaine
/configurer progression ducats:5 plafond:200
/configurer afficher
/audit                        # vérifie ce qui est exposé
```

Sans rôle de modération ni salon d'alerte, le bot fonctionne mais **ne
prévient personne** : `/audit` le signale explicitement.

## La musique

Le module a besoin de deux exécutables installés sur la machine :

- **FFmpeg** — [ffmpeg.org/download](https://ffmpeg.org/download.html), puis
  ajouter le dossier du binaire au `PATH`, ou renseigner `CHEMIN_FFMPEG` ;
- **yt-dlp** — [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp/releases),
  puis `CHEMIN_YTDLP` pointant sur l'exécutable.

Sans eux, les onze commandes de musique répondent « yt-dlp est introuvable »
ou « salon vocal inaccessible » — et **seulement** elles : le reste du bot
n'est pas affecté.

Le bot diffuse dans le salon où vous êtes, jamais dans un autre. Il quitte le
salon trente secondes après le départ du dernier membre.

## L'hébergement sous Windows

Le bot se lance comme le wiki et Caddy, par une tâche planifiée :

```powershell
# PowerShell en administrateur, depuis la racine du projet
powershell -ExecutionPolicy Bypass -File .\deploy\windows\installer-services.ps1 -DelphinaBot
```

Sans l'option `-DelphinaBot`, l'installeur ignore le bot : la tâche n'est
créée que si vous le demandez, et seulement si le projet est compilé.

## Organisation du code

```
delphinabot/
  src/
    index.ts              démarrage : env, configuration, base, connexion
    client.ts             le client Discord et son état
    config.ts             lecture stricte de l'environnement
    commandes/            un fichier par module, une commande par objet
    core/                 types, permissions, routeur
    db/                   schéma et dépôts (une table par fichier)
    lib/                  outils purs : durées, texte, embeddings, fenêtres
    modules/              la logique métier partagée
    evenements.ts         arrivée, message, voix, ronde de fond
  ressources/             quiz, citations, décrets, marché (JSON)
  scripts/                déploiement, vérification, essai
```

Deux règles tenues partout : **aucune opération d'argent hors de SQL**
(transferts en transaction, soldes jamais recalculés en mémoire) et
**aucune sanction effacée** (une sanction est levée, jamais supprimée).

## Commandes

`/aide` liste tout, `/aide <commande>` explique une commande en détail.
