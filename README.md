# 🏳️ Wiki du IIIe Delphinat de Gratianopolis

Wiki officiel de la micronation Discord **[IIIe Delphinat de Gratianopolis](https://discord.gg/gratianopolis)**.

**Consultation publique** · **édition réservée aux charges de la Constitution** (Dauphin, Régent, Conseil Delphinal, Baillit)

**Stack :** Node.js · Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS

---

## 🗺️ Vue d'ensemble

| Espace | Page | Description |
| --- | --- | --- |
| Public | `/` | Accueil : derniers articles, Constitution, raccourcis |
| Public | `/wiki` · `/wiki/[slug]` · `/wiki/categorie/[category]` | Le wiki, ses articles et ses 6 catégories (encadré de synthèse, sommaire, liens internes) |
| Public | `/wiki/[slug]/versions` | Historique complet + diff ligne à ligne et mot à mot |
| Public | `/recherche` | Recherche intelligente : facettes, fautes tolérées, suggestions |
| Public | `/tags` · `/tags/[tag]` | Nuage de tags et articles partagés |
| Public | `/plan` | Plan du site : index alphabétique, pages spéciales, mots-clés, état du graphe |
| Public | `/constitution` | Prévisualisation du PDF officiel (chargée à la demande) |
| Public | `/personnalites` | Membres du serveur Discord, données réelles uniquement |
| Public | `/institutions` | Les 8 charges constitutionnelles et leurs détenteurs |
| Public | `/credits` | Crédits : auteur (Eitam), sources, contributions et outillage |
| Édition | `/connexion` | Connexion (charges constitutionnelles) |
| Édition | `/admin` · `/admin/nouveau` · `/admin/[slug]/modifier` | Tableau de bord, création, édition, assistant de rédaction |
| Édition | `/admin/[slug]/historique` · `/admin/activite` | Historique paginé et filtrable, activité récente du wiki |
| API | `/api/**` | `auth`, `articles` (+ `export`, `revisions`, `restore`), `search`, `analysis`, `ai`, `sync/discord`, `sync/bot`, `cron/discord`, `seed`, `health` |

---

## 📜 Contenu : rien n'est inventé

| Principe | Mise en œuvre |
| --- | --- |
| **Textes juridiques** | `Constitution.pdf` (à la racine) est **prévisualisé dans le site** (`/constitution` et article *Constitution*) et transcrit **intégralement** dans le wiki. Orthographe d'origine conservée, téléchargement direct fourni. |
| **Institutions** | Les pages *Hiérarchie*, *Dauphin*, *Conseil Delphinal*, *Gouvernement*, *Assemblée*, *Baillits* reprennent uniquement la Constitution. |
| **Lois** | *Les lois du IIIe Delphinat* indexe les 18 articles (P-1 → P-17, dont P-15.1) en résumant l'objet de chacun ; le texte opposable reste la page *Constitution*. |
| **Histoire / Géographie** | Ces deux pages ne renseignent que ce que les sources établissent : la date du 26/09/26 et le fait qu'il s'agit d'une micronation Discord. Les rubriques inconnues (capitale, frontières, chronologie des gouvernements) sont **affichées comme non définies** et signalées « à documenter », jamais remplies par une supposition. |
| **Boîtes d'informations** | Chaque infobox est saisit par la rédaction, mais **toute valeur affichée est vérifiable** : dates issues du PDF, extrait de Constitution, ou métadonnée réelle de l'article. |
| **Personnalités** | Bougre, Selios, Baron, Esto, Eitam : **aucune biographie fabriquée**. Avatar, pseudo, rôles et ancienneté proviennent de l'API Discord du serveur officiel. |
| **Charges** | `/institutions` reprend la hiérarchie P-1 (huit charges) et, pour chacune, l'extrait de Constitution justifiant les droits d'édition accordés dans l'interface. |
| **Modération** | Aucun règlement de modération n'existe dans la Constitution → **aucune page de modération inventée**. Les règles réellement prévues figurent aux articles P-2 à P-13. |
| **Repli** | Si la synchronisation Discord n'est pas configurée, le site affiche une mention explicite plutôt que des données fictives. |

> Le texte du PDF a été extrait sans OCR ni reformulation via `scripts/extract_pdf_text.py`
> (décodage des polices sous-ensemble / `ToUnicode`).

---

## ✨ Fonctionnalités

### Le Markdown du wiki

Le moteur est volontairement minimal et **sûr** : tout le texte est échappé, et seules les constructions reconnues sont converties. Il n'en reste pas moins plusieurs pièges que le moteur traite explicitement, tous couverts par `npm run check:markdown` :

- **Le `|` d'un lien wiki n'est pas un séparateur de colonne.** `[[massivie|Massivie]]` dans une cellule donnait auparavant `[[massivie` comme texte, une colonne parasite, et un en-tête désaligné du corps — sur la forme même des liens internes du wiki. Le découpage d'une ligne de tableau respecte désormais les tubes échappés (`\|`), le code inline, les liens wiki et les URL ;
- **Un tableau n'est un tableau que s'il a sa ligne de séparation.** Sans cette preuve, une phrase contenant un `|` n'est plus découpée n'importe comment ;
- **Les barres de bord sont facultatives** (`A | B` vaut `| A | B |`) et les lignes sont alignées sur la largeur de l'en-tête, pour qu'une ligne courte ne déforme pas la grille ;
- **Les listes sont imbriquées** selon leur indentation. L'aplatissement produisait un `<ul>` dans un `<ul>`, du HTML invalide que le navigateur corrige à sa façon ;
- **Le repli des lignes n'interrompt plus la syntaxe.** Une construction qui tombe à cheval sur un retour à la ligne — `[[cible|libellé\nlibellé]]`, très fréquent dès qu'on replie à 80 colonnes — n'était pas reconnue et s'affichait en clair. Les lignes d'un paragraphe sont réunies **avant** le rendu inline ;
- **Les ancres de titre sont uniques.** Deux sections intitulées « Histoire » produisaient le même identifiant : le sommaire pointait deux fois sur la première, et la seconde était inatteignable ;
- `***gras italique***` est reconnu, les citations se poursuivent sur les lignes non préfixées, et `javascript:` reste neutralisé.

### Les photos et illustrations

L'illustration d'un encadré se choisit dans l'espace d'édition, de trois façons :

1. **la photo de profil Discord** — relue en direct à chaque visite, donc jamais périmée et sans stockage ;
2. **un téléversement** — pour un drapeau, un sceau, une carte ;
3. **rien** — l'encadré garde ses données, sans image.

Le format est déduit des **octets du fichier** et non de son nom : un fichier renommé `.png` qui contient du HTML, ou un SVG, est refusé — le SVG est un document XML capable de porter du script. Un fichier **tronqué** l'est aussi : ses dimensions lisent correctement dans l'en-tête, mais il s'afficherait cassé, alors que c'est précisément ce que l'envoi doit empêcher.

> Les images déposées sont servies par `/media/<fichier>`, et non depuis `public/`. Next.js recense `public/` au démarrage : un fichier déposé ensuite n'aurait été servi qu'après un redémarrage, et l'en-tête du formulaire aurait affiché une image cassée sans la moindre erreur.

> **Sur Vercel, le téléversement est refusé (503)** : le disque est reconstruit à chaque déploiement, l'image disparaîtrait au suivant. C'est pourquoi la route le dit plutôt que d'accepter un envoi qui fonctionnerait en apparence. Utilisez la photo de profil Discord, qui n'a pas cette limite.



### Ergonomie « type Wikipédia »

- **Mise en page d'encyclopédie** : l'article est une page de dictionnaire, pas un billet de blog. Le corps du texte est composé dans un **sérif de labeur** (Source Serif 4, 17 px, interlignage 1,75, longueur de ligne mesurée à ≈ 66 caractères, césure française activée) tandis que tout l'appareil — titres de rubriques, encadrés, tableaux, menus — reste en **sans empattements** (Inter) et les titres de l'encyclopédie en Cormorant Garamond. C'est ce changement de police entre le texte et son appareil qui rend la page lisible d'un coup d'œil.
- **Chapeau** : le résumé de l'article est présenté en grand, avec un filet doré, avant le texte — le lecteur décide en une phrase s'il continue.
- **Onglets d'article** : `Article` (vue courante, `aria-current="page"`), `Versions (n)` et `Modifier`. L'onglet **Modifier** n'apparaît que pour les charges qui ont constitutionnellement le droit d'écrire (`canWrite`) : un visiteur anonyme ne voit jamais un lien vers une page qu'il ne pourrait pas ouvrir. Aucun onglet ne mène nulle part — le wiki n'a pas de page de discussion, donc il n'en annonce pas.
- **Boîte d'informations (infobox)** : l'encadré de synthèse le plus caractéristique de Wikipédia est présent sur **tous** les articles. À partir de 1280 px, il occupe la colonne de droite, au-dessus du sommaire, et reste **collant** au défilement (la colonne défile si l'encadré est plus haut que l'écran). En dessous, il se replie dans un accordéon natif (`<details>`, sans JavaScript) sous le titre. Contenu : bandeau de titre, illustration interne, données clés en lignes alternées, mention de source.
  - **Infobox automatique** : si la rédaction n'a rien saisi, l'encadré est construit à partir des métadonnées réelles de l'article (catégorie, rédacteur, date de publication, dernière révision, nombre de versions). Un article n'est donc jamais sans encadré.
  - **Infobox personnalisée** : l'éditeur permet de saisir jusqu'à 12 lignes libellé/valeur, une illustration, une légende et une mention de bas d'encadré ; les lignes se réordonnent et se suppriment.
  - **Validation serveur** : l'illustration doit être une image **du site** (`/flag.webp`…), jamais une URL externe ; une image sans texte alternatif est refusée ; les valeurs sont tronquées, nettoyées des caractères de contrôle, et rendues comme du texte React (échappement garanti, aucune injection possible).
- **Sommaire numéroté** : généré à partir des titres `##` et `###`, avec la numérotation des dictionnaires (`1`, `1.1`, `2`…) **calculée à l'affichage** — un article n'a pas à être renuméroté quand une section est ajoutée au milieu. La rubrique en cours de lecture est mise en évidence (`IntersectionObserver`), le sommaire se **replie** (bouton « masquer »), et il est replié par défaut sur mobile où il devient un `<details>`.
- **Liens internes et liens rouges** : syntaxes `[[Article]]` et `[[Article|texte]]` ou `[texte](/wiki/article)`. Un `[[Article]]` dont la cible **n'existe pas encore** s'affiche en **rouge** — convention des encyclopédies — et reste cliquable : il mène à la recherche sur ce titre, donc vers une page qui existe, jamais vers une 404. Le texte affiché est le **titre** de l'article, jamais le slug technique. Les **liens morts sont signalés** dans l'assistant de rédaction.
- **Bas de page d'article** : encadrés réduits « Voir aussi » et « Cité par », **catégories** et tags, puis la mention « La dernière modification de cette page a été réalisée le … par … ».
- **Historique & versions** : page `/wiki/[slug]/versions` avec diff ligne à ligne et mot à mot, restauration en un clic, et recherche paginée dans `/admin/[slug]/historique` et `/admin/activite`.
- **Navigation d'ensemble** : **rétroliens** (« Cité par »), articles voisins, précédent/suivant, **graphe de liens** et pages d'orphelins sur `/plan`.
- **Index alphabétique** : `/wiki` ouvre sur une barre **A–Z** dense (lettres sans article grisées) qui saute aux sections, puis le même contenu classé par thème. `/plan` en donne la version complète.

### Esthétique et interface

- **Thème « médiéval-gouvernemental »** : bleu nuit, or et gris ardoise, Cormorant Garamond pour les titres, Inter pour l'interface, Source Serif 4 pour la prose. Toutes les couleurs passent par des **variables CSS** : un composant s'écrit une fois (`bg-night-800 text-slate-200`) et fonctionne dans les deux thèmes.
- **Hiérarchie typographique centralisée** : tout l'habillage d'un article (titres, listes, citations, tableaux, encadrés, liens) est défini **une seule fois** dans le bloc `.markdown` de `globals.css`. Le renderer Markdown ne produit plus de classes de style ad hoc : ajouter une rubrique, un tableau ou une citation donne automatiquement le même rendu, partout.
- **Modes sombre et clair** : bouton dans l'en-tête. Le thème est appliqué par un **script exécuté avant le premier rendu** (aucun clignotement), mémorisé dans `localStorage`, et par défaut aligné sur la préférence du système. L'icône est affichée par CSS et non par un état React : **aucun risque de divergence d'hydratation**.
- **Transitions de page** : chaque navigation rejoue une apparition douce (`template.tsx` + animation CSS), neutralisée si l'utilisateur a demandé moins d'animations.
- **Responsive** : colonne latérale au-dessus de 1280 px, encadré et sommaire repliés en dessous, barre de catégories horizontale sous `lg`, cibles tactiles de 40 px minimum.
- **Zéro bug d'hydratation** : `npm run check:theme` relève les couleurs réellement calculées dans les deux thèmes **et** surveille la console du navigateur (avertissements React, divergences d'attributs).

### Lecture et navigation

- **Graphe de liens interne** : les syntaxes `[[Article]]` et `[texte](/wiki/article)` sont résolues, les **liens morts sont signalés** dans l'assistant de rédaction, chaque article affiche ses **rétroliens (« Cité par »)**, ses **articles voisins**, son **sommaire actif** au défilement et sa **barre de progression** de lecture.
- **Dernières modifications** : la page d'accueil publie le flux des dernières révisions (article, auteur, date, lien vers l'historique), comme la « liste des modifications » d'une encyclopédie.
- **Tags** : `/tags` (nuage) et `/tags/[tag]` (articles partageant le tag).
- **PDF officiel** : aperçu chargé à la demande (`<object>` → `<iframe>` → lien de secours), sans jamais bloquer l'affichage.
- **Précédent / suivant** : navigation alphabétique dans la catégorie.
- **Vrais 404** : une page inexistante répond `404` (le squelette de chargement est volontairement limité à `/admin` : une frontière Suspense à la racine envoyait la réponse avant la résolution et transformait les 404 en 200). La page d'erreur distingue l'article jamais rédigé de la page déplacée et propose une **recherche immédiate** (formulaire GET, donc utilisable sans JavaScript), l'index du wiki et la proposition de l'article.

### Recherche intelligente

- **Scoring pondéré** : titre > tags > résumé > contenu, avec bonus de correspondance exacte et retrait des mots vides.
- **Tolérance aux fautes** : distance de Levenshtein bornée — `delpinat` trouve « delphinat », `constituion` propose « constitution ».
- **Facettes** : comptage par catégorie, cliquable pour affiner les résultats.
- **Surlignage** des termes trouvés (`<mark>`) et indication du champ correspondant (titre, tag, résumé, contenu). Les extraits sont composés dans la même police que la prose, pour retrouver dans le résultat la texture du texte cherché.
- **Suggestions corrigées** : `delpinat` → *delphinat*, *delphinal*.
- Recherche globale **Ctrl + K** et page `/recherche` complète, limitée à 60 requêtes/minute et par IP.

### Édition

- **Charges constitutionnelles** (article P-1) : `dauphin`, `regent`, `conseil`, `baillit`, `premier-ministre`, `ministre`, `representant`, `depute`. Le **Dauphin** possède tous les pouvoirs ; **Régent**, **Conseil Delphinal** et **Baillit** créent, modifient et restaurent ; les charges représentatives sont en consultation seule (mention constitutionnelle affichée dans `/admin`).
- **Assistant de rédaction** (`/api/analysis`, panneau latéral de l'éditeur) : statistiques de lecture, **checklist qualité**, **suggestion de catégorie et de tags**, **détection de doublons** (Jaccard + proportion de groupes de 3 mots, seuil 30 %), **détection de liens cassés** et **résumé extractif**. Aucune suggestion n'est appliquée automatiquement : tout reste indicatif.
- **Éditeur d'infobox** : section « Boîte d'informations » du formulaire, avec interrupteur *infobox personnalisée / automatique*, ajout, réordonnancement et suppression des lignes.
- **Jeu de données initial** : `/admin` → *Installer / mettre à niveau* (`POST /api/seed`, Dauphin). Publie les articles de `src/lib/seed-data.ts` qui manquent et pose les infoboxes absentes, **sans jamais modifier le texte** d'un article existant. Idempotent, journalisé dans l'historique, limité à 6 exécutions/minute.
- **Historique paginé et cherchable** : chaque création, modification, suppression et restauration est tracée (50 révisions par article). `/admin/[slug]/historique` et `/admin/activite` proposent une **recherche plein texte** (titre, résumé, contenu de la révision), des **filtres par action et par auteur** et une **pagination** (10 / 20 / 50 par page) — le tout en liens, sans JavaScript, donc partageable et indexable.
- **Plan du site** (`/plan`) : page générée à partir du contenu réel — articles par catégorie, index alphabétique avec sauts par lettre, pages spéciales, mots-clés, articles les plus cités et **articles sans lien entrant** (à relier).
- **Comparaison de versions** : diff ligne à ligne avec surlignage mot à mot, statistiques, chronologie, restauration en un clic.
- **Export** : `/api/articles/export` (réservé aux rédacteurs) renvoie l'intégralité du wiki en JSON.
- **Synchronisation Discord** : membres, rôles et statistiques via l'API officielle v10, cache de 10 minutes, résolution automatique des identifiants par nom. Réservée au Dauphin.

### Technique

- **Cadres d'images qui épousent le contenu** (`FramedImage`) : le cadre adopte le **ratio naturel** de l'image, mesuré au chargement, et l'image est en `object-contain` : un drapeau 8/5 n'est jamais rogné dans un cadre carré, ni flottant dans des bandes vides. C'est aussi vrai pour les illustrations d'infobox, quelles qu'elles soient. Le composant accepte les dimensions réelles et une priorité de téléchargement (`fetchPriority="high"` sur le drapeau d'ouverture), pour que le navigateur réserve la bonne place et récupère l'image de contenu en premier.
- **Polices auto-hébergées et variables** : Cormorant Garamond, Inter et Source Serif 4 sont téléchargées et servies par Next.js (aucun appel à Google Fonts), en **version variable** — un fichier par famille au lieu d'un fichier par graisse. `font-display: swap` et une police de repli aux métriques ajustées (`adjustFontFallback`) évitent le texte invisible et le décalage de mise en page.
- **Fluidité** : défilement fluide, `scroll-padding-top` et `scroll-margin` pour que les ancres profondes ne passent jamais sous l'en-tête collant, `text-wrap: balance` sur les titres et `pretty` sur les paragraphes (aucune ligne d'un seul mot en fin de paragraphe), et `scrollbar-gutter: stable` pour que l'apparition de la barre de défilement ne décale pas la page.
- **Audit de rendu automatisé** (`npm run check:render`) : le site est mesuré dans un vrai moteur (Edge en headless, piloté par le protocole DevTools, sans dépendance) en **390 × 844 px** et **1440 × 900 px**. L'audit vérifie le débordement horizontal et le **zoom automatique** du navigateur (qui rendait les contrôles mobile aveugles), les éléments hors cadre, les **images rognées ou étirées**, le **texte coupé** par `overflow: hidden`, les troncatures « … », les **contrôles qui se recouvrent**, les **sauts de mise en page** après chargement des images, les contrastes WCAG AA, les tailles de police, les cibles tactiles (24 px normatifs, 40 px confortable), les `alt` manquants, le nombre de `<h1>`, les sauts de niveaux de titres **et les erreurs de console** (avertissements React, divergences d'hydratation). `THEME=light` / `THEME=dark` force le thème audité. Résultat actuel : **100 vues (50 pages, mobile + desktop), 0 problème dans les deux thèmes**.
- **Diagnostic ponctuel** (`node scripts/dump-rects.mjs <page> <sélecteur…>`) : affiche rectangles, styles, alignement et ancêtres rognants d'un élément, pour trancher entre un vrai bug et un faux positif.
- **Vérification du thème** (`npm run check:theme`) : relève les couleurs réellement calculées dans les deux thèmes et confirme l'absence d'erreur d'hydratation.
- **Sécurité — en-têtes appliqués selon le protocole réel.** La CSP, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` et `nosniff` sont posés par `src/middleware.ts`, qui est le seul endroit à connaître le protocole de la requête — `headers()` de `next.config.mjs` étant évalué à la construction, sans accès à la requête. Ce détail a une conséquence très concrète : la directive `upgrade-insecure-requests` ordonne au navigateur de rejouer le CSS et le JS en HTTPS. Chrome n'exempte de cette règle que les origines « potentiellement fiables » (`localhost`, `127.0.0.1`, les `.local`) — **pas** une adresse IP privée. Sans condition, un wiki servi sur `http://192.168.1.22:3000` s'affichait entièrement **sans feuille de style** : le navigateur demandait `https://192.168.1.22:3000/…` vers un port qui ne parle pas TLS. HSTS et `upgrade-insecure-requests` ne partent donc qu'en HTTPS, où ils ont un sens, et `X-Forwarded-Proto` est pris en compte pour rester correct derrière Caddy, qui termine le TLS en amont. La table des en-têtes est plus bas.
- **Stockage** interchangeable JSON / PostgreSQL, bascule par `DATABASE_URL` seule (colonnes `infobox` ajoutées automatiquement, `ALTER TABLE … IF NOT EXISTS`).
- **Drapeau** : `flag.png` (3200 × 2000) décliné par `npm run assets` en **version web au ratio réel** (640 × 400), en icônes **carrées opaques** (fond bleu nuit, liseré or, drapeau entier et centré) et en image OpenGraph. Aucune déclinaison ne rogne le drapeau.
- **SEO / PWA** : `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, OpenGraph, icônes 192/512, rendu 100 % dynamique (contenu toujours frais).
- **Robustesse** : `error.tsx`, `not-found.tsx`, squelette de chargement pour `/admin`, page d'erreur explicite en cas de base injoignable.

---

## 🚀 Installation

```bash
npm install
cp .env.example .env      # renseignez vos comptes et clés
npm run dev               # http://localhost:3000
```

Production :

```bash
npm run build && npm run start
```

Au premier démarrage, `data/articles.json` est créé avec le contenu officiel.

### Mettre à jour le contenu officiel

`src/lib/seed-data.ts` est le **jeu de données initial** (articles de constitution du wiki). Il n'est inséré que si le magasin est vide. Pour publier ses évolutions dans un wiki déjà peuplé :

```bash
# espace d'édition /admin → « Installer / mettre à niveau » (réservé au Dauphin)
curl -X POST -b "cookies.txt" -H "Content-Type: application/json" -d '{}" \
     http://localhost:3000/api/seed
# {"ok":true,"report":{"created":[…],"enriched":[…],"unchanged":[…]}}
```

Ce que fait cette commande, et **seulement cela** :

- elle **crée** les articles du jeu de données qui n'existent pas encore ;
- elle **pose l'infobox** d'un article existant uniquement si celui-ci n'en a pas ;
- elle ne modifie **jamais** le titre, le résumé, le contenu, les tags ni les dates d'un article existant ;
- elle consigne chaque opération dans l'historique des révisions.

### Se connecter la première fois

Les comptes viennent de `WIKI_USERS` dans `.env` (voir ci-dessous). En production, hachez les mots de passe :

```bash
npm run hash-password -- "mot de passe long et unique"
# → scrypt$sel$empreinte   à coller dans WIKI_USERS
```

---

## 🔑 Variables d'environnement

```ini
# --- Comptes d'édition -----------------------------------------
# Les charges sont celles de la Constitution (article P-1) :
#   dauphin | regent | conseil | baillit | premier-ministre
#   | ministre | representant | depute
# Droits : dauphin = tout ; regent/conseil/baillit = écriture ; les autres = lecture
WIKI_USERS="esto:motdepasseDuDauphin:dauphin,baillit1:motdepasseDuBaillit:baillit"
AUTH_SECRET=<openssl rand -base64 32>

# En production, hachez les mots de passe (npm run hash-password) :
#   WIKI_USERS="esto:scrypt$sel$empreinte:dauphin"

# --- Synchronisation Discord ------------------------------------
DISCORD_BOT_TOKEN=<token du bot>
DISCORD_GUILD_ID=<identifiant du serveur>

# --- Liaison signée avec le bot (écosystème partagé) -------------
# Secret HMAC-SHA256 partagé entre le bot et le wiki. Générez-le :
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Doit contenir exactement la MÊME valeur dans .env (wiki) et bot/.env (bot).
# Sans lui, le bot tourne en lecture seule : il journalise au lieu de pousser.
BOT_SYNC_SECRET=<64 caractères hexadécimaux>

# --- Base de données (optionnel) ---------------------------------
# Vide = fichiers JSON locaux. Défini = PostgreSQL.
DATABASE_URL=postgresql://wiki:wiki@localhost:5432/gratianopolis

# --- Optionnel ---------------------------------------------------
SITE_URL=https://wiki.example.com
```

`ADMIN_USERNAME` / `ADMIN_PASSWORD` restent acceptés : s'ils sont seuls définis, ils créent un compte portant la charge **dauphin**.

---

## 🔄 Synchronisation Discord

1. **Créer l'application** : <https://discord.com/developers/applications> → *Bot* → *Reset Token* → `DISCORD_BOT_TOKEN`.
2. **Activer le "Server Members Intent"** (onglet Bot → Privileged Gateway Intents), sans quoi la liste des membres est refusée par l'API.
3. **Inviter le bot** : OAuth2 → URL Generator → scope `bot` + permission *View Server Members*.
4. **Récupérer l'ID du serveur** : Paramètres → Paramètres avancés → activer le *Mode développeur*, puis clic droit sur l'icône du serveur → *Copier l'identifiant du serveur* → `DISCORD_GUILD_ID`.
5. **Lancer la synchronisation** : espace d'édition `/admin` → *Synchroniser maintenant* (réservé au Dauphin), ou :

```bash
curl -X POST -b "cookies.txt" http://localhost:3000/api/sync/discord
```

Les IDs Discord des personnalités sont **résolus automatiquement par nom**. Vous pouvez aussi forcer l'identifiant d'un profil via le champ *ID utilisateur Discord* de l'éditeur.

---

## 🤝 Écosystème partagé : le wiki parle au bot

Le wiki et le bot ne se parlent pas par une base de données commune (trop couplé) ni par du HTML copié-collé : ils partagent **un fichier de configuration unique**, et se parlent par **une route API signée**.

### `shared/roster.json` — la source unique

C'est **le seul fichier à éditer à la main**. Il décrit :

| Bloc | Contenu |
| --- | --- |
| `personnages` | `slug` (page du wiki), `nom`, `discordUserId`, `aliases`, `roles`, `charge`, `actif` |
| `roleMapping` | rôle Discord ↔ charge constitutionnelle ↔ article, pour les 8 charges |
| `historique` | les 4 périodes du Delphinat, ordonnées |

`src/lib/roster.ts` le lit et le **valide au chargement** (champ manquant → erreur explicite, pas un `undefined` silencieux plus loin). Un rôle Discord modifié dans `roster.json` se répercute donc immédiatement sur le wiki, sans code.

### Rattacher les personnages aux pseudos réels

```bash
npm run link:roster            # rapport, n'écrit rien
npm run link:roster -- --write # écrit les correspondances non ambigües
```

Le script interroge l'API Discord et apparie chaque fiche à un membre du serveur par correspondance **exacte** du nom ou d'un alias. En cas d'ambiguïté (`eitam.officiel` **et** `eitam.off` pour Eitam), il **laisse le champ vide** et affiche les candidats : trancher, c'est votre décision, pas celle d'un script.

> État actuel : **Esto**, **Baron**, **Selios**, **Bougre**, **Swaylo** et **Eitam** sont rattachés (les cinq identifiants officiels ont été saisis dans `roster.json`). **Baron** a une photo **animée** : son portrait est un GIF, servi et mis en cache dans ce format.

### Les portraits de profil dans les infoboxes

L'illustration d'une fiche est résolue dans cet ordre (`src/lib/avatar-url.ts`) :

1. **l'avatar live** de l'API Discord (`guild` → `user` → avatar par défaut) ;
2. **le cache local** `public/avatars/<id>.<ext>` ;
3. `null` — l'encadré retombe alors sur l'illustration choisie par la rédaction, qui n'est **jamais écrasée**.

```bash
npm run cache:avatars          # fige les portraits sur le disque
npm run cache:avatars -- --dry # seulement le rapport
```

Le CDN Discord renvoie un **403 sans en-tête `User-Agent`** : le script en envoie un, et vérifie la signature de l'image avant d'écrire quoi que ce soit.

#### Les formats d'image

Les cinq formats sont pris en charge, et **chacun est conservé tel quel** :

| Format | Où il vient |
| --- | --- |
| **PNG** | avatar fixe — le cas le plus fréquent |
| **JPEG / JPG** | accepté en entrée comme en sortie |
| **GIF** | avatar **animé** : Discord le signale par le préfixe `a_` sur l'empreinte et ne le sert qu'en GIF |
| **WebP** | accepté ; format le plus léger pour le drapeau du site |

Deux conséquences techniques, parce que le format n'est pas décoratif :

- **l'extension demandée au CDN suit le format réel.** Demander `.png` pour un avatar animé ne renvoyait pas une erreur mais une image figée sur la première image de l'animation — le portrait du membre disparaissait sans aucun avertissement. `memberAvatarUrl` demande donc `.gif` dès que l'empreinte commence par `a_` ;
- **le nom du fichier en cache n'est plus devinable.** Le script déduit le format des **premiers octets** de la réponse (nombre magique) et écrit `public/avatars/<id>.<ext>` ; `index.json` fait le lien identifiant → fichier, et c'est `src/lib/avatar-cache.ts` qui le lit. Deviner `<id>.png` affichait une image cassée pour tout portrait non-PNG.

> Piège corrigé au passage : la liste blanche d'URL n'acceptait que `[a-z0-9]`, alors que l'empreinte d'un avatar animé commence par `a_`. Le `_` rejetait l'URL, et **tout membre ayant une photo animée se voyait attribuer la silhouette grise par défaut** — sans erreur visible, puisque l'absence de portrait est un repli légitime. La forme `(a_)?[a-z0-9]{8,64}` autorise le préfixe à sa place exacte, et lui seul.

Côté sécurité, une infobox n'accepte qu'une image **interne au site** (PNG, JPEG, GIF, WebP ou AVIF) ou un **avatar Discord** — validé par une expression stricte sur `cdn.discordapp.com` (`src/lib/discord-avatar-url.ts`, module pur utilisable par le client comme par le serveur). Aucune URL arbitraire ne peut donc être injectée, et le SVG est volontairement refusé : c'est un format texte capable de porter du script.

### Le bot qui pousse ses changements

`bot/` est un squelette autonome (discord.js) qui lit le **même** `shared/roster.json` :

```bash
cd bot && npm install
# bot/.env  →  DISCORD_BOT_TOKEN, WIKI_URL, BOT_SYNC_SECRET
node index.js
```

À chaque `guildMemberUpdate` / `guildMemberAdd`, il pousse `{slug, discordUserId}` vers `/api/sync/bot`, **signé** en HMAC. La route :

- rejette toute signature invalide ou horodatage de plus de 5 minutes ;
- limite à 20 liens par requête et à 60 requêtes/minute ;
- n'accepte que des fiches `personnalites` **présentes dans le roster** ;
- ne publie **jamais** les identifiants Discord dans sa réponse.

**Si `BOT_SYNC_SECRET` est absent du bot, il ne casse pas** : il passe en lecture seule et journalise ce qu'il aurait poussé.

### Protéger le texte officiel : empreintes et mises à niveau

`SEED_VERSION` (`src/lib/seed-data.ts`) monte quand le contenu officiel évolue. `POST /api/seed {"refresh": true}` — le bouton *Mettre à jour les textes* — compare chaque article stocké à son empreinte (`src/lib/fingerprint.ts`, un **module unique** partagé par le wiki et les scripts) :

| Cas | Effet |
| --- | --- |
| Empreinte identique au manifeste | le texte est mis à niveau |
| Article **retouché à la main** | il est **protégé**, jamais écrasé, et signalé dans le rapport |
| Article absent | créé |

Le résultat est **idempotent** : deux exécutions successives donnent `unchanged: 22`. Pour repartir de zéro : `rm -rf data` puis *Installer*.

> `fingerprint.ts` ne doit pas être dupliqué : c'est lui qui garantit que le wiki, le script de contrôle et le manifeste parlent de la même version d'un article. Sa duplication avait produit 11 divergences sur 22.

---

## 🗄️ Stockage

Deux pilotes derrière la même interface (`src/lib/store/`) :

- **JSON** (par défaut) : `data/articles.json` + `data/revisions.json` — parfait en auto-hébergement, **impossible sur Vercel** (voir [Déploiement](#️-déploiement-sur-vercel)) ;
- **PostgreSQL** : il suffit de définir `DATABASE_URL`. Le schéma (`articles`, `revisions`) est créé automatiquement au premier accès et le contenu de lancement est inséré si les tables sont vides.

`src/lib/store/environment.ts` distingue ces deux mondes. Sur une plateforme sans écriture persistante, le pilote JSON **refuse d'écrire** au lieu d'échouer en silence : une édition « enregistrée » puis perdue est le pire des deux mondes. `poolOptions` adapte aussi la connexion au mode serverless — pool réduit à 2 connexions et conservé sur `globalThis` entre les invocations d'une fonction chaude, TLS activé par défaut comme l'exigent Neon, Supabase et Railway.

### Basculer sur PostgreSQL

```bash
# 1. Installer Docker Desktop (https://www.docker.com/products/docker-desktop/)
#    puis lancer l'image fournie :
docker compose up -d

# 2. Vérifier la connexion, le schéma et les droits d'écriture
node scripts/check-db.mjs

# 3. Dans .env, décommenter puis redémarrer l'application
#    DATABASE_URL=postgresql://wiki:wiki@localhost:5432/gratianopolis
npm run dev
```

Aucune migration manuelle n'est nécessaire : les tables, index et le contenu initial sont créés au premier accès.

**Si la base est arrêtée**, le site ne tombe pas dans un silence mysterious : `/api/health` renvoie `503 degraded` avec la cause exacte (`ECONNREFUSED`, identifiants refusés…), le panneau *Infrastructures* de `/admin` affiche l&apos;incident, et les visiteurs voient une page d&apos;erreur explicite. Dès que PostgreSQL redémarre, l&apos;application se reconnecte toute seule (la réinitialisation n&apos;est pas mémorisée en cas d&apos;échec).

```bash
curl -s http://localhost:3000/api/health | jq
# {"status":"ok","storage":{"driver":"postgres","url":"postgresql://wiki:***@…"},…}
```

### API

| Route | Accès | Rôle |
| --- | --- | --- |
| `GET /api/articles` · `GET /api/articles/[slug]` | public | Liste et lecture des articles |
| `GET /api/search?q=` | public | Recherche (scoring, facettes, suggestions) |
| `GET /api/articles/[slug]/revisions` | public | Historique **paginé et filtrable** : `page`, `perPage` (max 100), `q`, `action`, `author` |
| `POST` / `PUT` / `DELETE /api/articles…` | rédacteurs / Dauphin | Écriture, suppression, restauration |
| `GET /api/articles/export` | rédacteurs | Sauvegarde JSON complète |
| `POST /api/analysis` | rédacteurs | Assistant de rédaction |
| `GET /api/revisions` | rédacteurs | Fil d'activité global paginé et filtrable |
| `POST /api/sync/discord` | Dauphin | Synchronisation du serveur Discord |
| `POST /api/seed` | Dauphin | Installe le jeu de données initial ; `{ "refresh": true }` met à niveau les textes officiels **sans toucher aux retouches humaines** |
| `POST /api/sync/bot` | **secret HMAC** (`x-wiki-signature`) | Le bot rattache un `discordUserId` à une fiche du roster. Accepte au plus 20 liens et n'écrit que sur des pages `personnalites` |
| `GET /api/sync/bot` | Dauphin | État de la liaison (roster, cache d'avatars, avatars résolus) — ne publie jamais les identifiants Discord |
| `GET /api/cron/discord` | **secret `CRON_SECRET`** | Synchronisation Discord **planifiée** (Vercel Cron, horaire déclaré dans `vercel.json`). Sans secret défini, elle répond 503 et se désactive |
| `GET /api/health` | public | Santé du stockage, synchronisation et **configuration de déploiement** (`problems` bloquants, `warnings`). Répond 503 si le contenu ne peut pas durer |
| `POST /api/images` | rédacteurs | Téléversement d'une image pour l'encadré (PNG, JPEG, GIF, WebP ; 2 Mio). Format vérifié par les octets, nom de fichier tiré au hasard, 30 envois par heure et par adresse |
| `GET /api/media/[name]` | public | Sert une image téléversée, avec `nosniff` et un cache immuable |

---

## 🔒 Sécurité

| Mesure | Où |
| --- | --- |
| Session **JWT HS256** signée, cookie `httpOnly` / `sameSite=lax` / `secure` en production, 8 h | `src/lib/jwt.ts` |
| Comparaison des mots de passe en **temps constant** (SHA-256 + `timingSafeEqual`) | `src/lib/users.ts` |
| **Hachage scrypt** supporté : `WIKI_USERS="esto:scrypt$sel$empreinte:dauphin"` (généré par `npm run hash-password`) | `src/lib/users.ts`, `scripts/hash-password.mjs` |
| **Révocation immédiate** : un compte retiré de `WIKI_USERS` perd l'accès sans attendre l'expiration | `src/lib/auth.ts` |
| Middleware : `/admin*` → redirection, mutations `/api/articles*` et `/api/sync*` → 401 | `src/middleware.ts` |
| **Liaison bot** : HMAC-SHA256 sur `${timestamp}.${corps}`, comparaison en **temps constant**, fenêtre de 5 min, en-têtes `x-wiki-signature` / `x-wiki-timestamp`. `/api/sync/bot` est la seule route exemptée du cookie (elle est authentifiée par signature) | `src/lib/bot-signature.ts`, `src/app/api/sync/bot/route.ts` |
| Une requête du bot ne peut écrire que sur une fiche `personnalites` **déjà présente dans le roster** : `la-constitution` et tout slug inconnu sont ignorés | `src/app/api/sync/bot/route.ts` |
| Rôles vérifiés **côté serveur** (l'UI masque les boutons, l'API renvoie 403) | `src/app/api/**` |
| Chaque droit est adossé à un extrait de la Constitution | `ROLE_INFO` dans `src/lib/types.ts` |
| **Anti-CSRF** : contrôle de l'origine + `Content-Type: application/json` exigé + corps ≤ 512 Ko | `middleware.ts`, `src/lib/request-security.ts` |
| **Limitation de débit** : 10 tentatives / IP et 5 / compte par 15 min sur la connexion, 60 requêtes/min sur la recherche | `src/lib/rate-limit.ts` |
| En-têtes : CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. **HSTS et `upgrade-insecure-requests` ne sont émis qu'en HTTPS** : `headers()` de `next.config.mjs` est évalué à la construction et ignore le protocole, ce qui cassait le rendu sur une IP privée | `src/lib/security-headers.ts`, `src/middleware.ts` |
| Markdown rendu en **échappant tout le HTML** (liste blanche de balises) | `src/components/MarkdownRenderer.tsx` |
| Une image téléversée est identifiée par ses **octets**, jamais par son nom ni par son `Content-Type` : un fichier renommé `.png` qui contient du HTML ou un SVG est refusé, et un fichier tronqué aussi | `src/lib/images.ts` |
| Un nom de fichier servi par `/media/` est validé **en entier** (`^[a-z0-9]{1,12}-[a-f0-9]{12}\.(png\|jpg\|gif\|webp)$`) : aucune remontée de chemin n'est possible | `src/app/media/[name]/route.ts` |
| **Infobox** : illustration interne obligatoire, texte alternatif exigé, valeurs bornées et nettoyées, rendu en texte React (aucune exécution de script possible) | `src/lib/infobox.ts`, `src/components/Infobox.tsx` |
| Requêtes SQL **toujours paramétrées** (`$1`, `$2`…), pagination appliquée par PostgreSQL et non en mémoire | `src/lib/store/pg-driver.ts` |
| Message de connexion uniforme (ne révèle pas l'existence d'un compte) | `src/app/api/auth/login/route.ts` |

**Avant la mise en ligne** : changez tous les mots de passe, générez un `AUTH_SECRET` unique, servedez en HTTPS, et supprimez `.env` du dépôt (déjà dans `.gitignore`).

---

## 📜 Les trois textes fondateurs

Le wiki conserve **les trois** constitutions, pas seulement celle en vigueur. Chacune
est transcrite intégralement et servie en PDF dans `public/`.

| Règne | Document | Page | PDF |
| --- | --- | --- | --- |
| Ier Delphinat | Règlement et organisation institutionnelle du serveur | [[reglement-du-ier-delphinat]] | `/Reglement-Ier-Delphinat.pdf` |
| IIe Delphinat | Constitution et Hiérarchie | `/constitution-du-2e-delphinat` | `/Constitution-IIe-Delphinat.pdf` |
| IIIe Delphinat | Constitution et Hiérarchie | `/la-constitution` | `/Constitution.pdf` |

Les deux PDF Sejacent à la racine du dépôt : deposit-les y, puis `npm run assets:history`
et ajoutez les pages ci-dessus au jeu de données.

### Retranscrire un PDF officiel

```bash
python scripts/extract_pdf_text.py "Constitution_Gratianopolis Ier Delphinat.pdf"
```

L'extracteur est **sans dépendance** et gère ce que les lecteurs PDF ratent souvent :
les flux **ASCII85 + Flate** combinés, les **polices incorporées** dont les accents ne
sont accessibles que par la table **ToUnicode**, les ressources de police référencées
**indirectement** (`/Font 1 0 R`) et les **chaînes littérales** avec échappements
octaux. Sans cela, le Règlement du Ier Delphinat sortait en « R001glement » — ou
complètement vide.

### Le drapeau historique

Le Ier et le IIe Delphinat partageaient un drapeau, distinct de celui du IIIe :

```bash
npm run assets:history   # drapeaux-Ier-IIe-Delphinat.webp + version 1024 px
```

`generate_historical_flag.mjs` préserve le ratio réel de la source (ici 1/1) : il ne
rogne pas et ne «bourre» pas de bandes transparentes, ce qui ferait croire à un drapeau
amputé.

---

## 👥 Fiches citoyens : personne n'est oublié

Le wiki retrace le récit, mais il reste un lieu de communauté : **tout membre du
serveur Discord a droit à une page**. La synchronisation (`POST /api/sync/discord`,
ou *Synchroniser maintenant* dans `/admin`) lit l'inventaire du serveur et crée pour
chaque membre sans page une fiche standard « Citoyen de Gratianopolis » (`src/lib/citizen-pages.ts`) :

- le **portrait**, lu sur l'API Discord (avatar vivant, puis cache local) ;
- le **pseudonyme exact** trouvé sur le serveur ;
- l'**ancienneté** et les **rôles** réellement portés ;
- une **biographie vide**, à compléter librement depuis l'espace d'édition.

### Deux garanties

1. **Jamais de page en double.** Le slug est dérivé du pseudonyme, puis suffixe si
   nécessaire ; si une page — rédigée à la main ou générée auparavant — occupe déjà
   cette place, le membre est **ignoré** et listé dans le rapport de synchronisation.
2. **Jamais d'écrasement.** Une resynchronisation ne réécrit que les champs **venus
   de Discord** (pseudonyme, ancienneté, rôles). Le titre, le résumé et le corps
   restent ce que la rédaction y a mis.

### L'ambiguïté n'est jamais tranchée au hasard

Un membre s'appelle souvent `pseudo` sur Discord tout en affichant `Capy` comme nom
global. Le rapprochement se fait donc sur le **pseudo, le nom global et le surnom**.
Si **plusieurs** membres correspondent, le wiki n'en choisit aucun et le dit
explicitement :

> `Eitam -> Ambigu : 2 membres du serveur portent un nom proche (Eitam, Eitam)`

Deux pièges corrigés au passage, qui produisaient des rattachements faux :

- un pseudonyme entièrement en caractères décoratifs se normalise en **chaîne
  vide**, et `cible.includes("")` est toujours vrai : ce membre correspondait alors à
  **toutes** les personnalités du wiki. Les noms vides sont désormais écartés, et une
  ressemblance exige au moins 3 caractères ;
- la correspondance approximative ne se déclenche plus sur le premier membre trouvé.

Rattachement en ligne de commande, avec la même prudence : `npm run link:roster`
(et `--write` pour enregistrer).

---

## 📂 Structure

```
├── Constitution.pdf          # document officiel (aussi servi dans /public)
├── flag.png                  # drapeau officiel (source des assets web)
├── docker-compose.yml        # PostgreSQL local
├── deploy/termux/          # hébergement tablette : Caddy, services, guide
├── scripts/
│   ├── extract_pdf_text.py   # extraction du texte officiel du PDF
│   ├── generate_flag_assets.mjs
│   ├── hash-password.mjs      # hash scrypt pour WIKI_USERS
│   ├── check-diff.mjs        # tests de l'algorithme de diff
│   ├── check-analysis.mjs    # tests de l'assistant de rédaction
│   ├── check-render.mjs      # audit de rendu (Edge headless, mobile + desktop, 2 thèmes)
│   ├── check-theme.mjs       # bascule clair/sombre + détection d'hydratation
│   ├── dump-rects.mjs        # diagnostic : rectangles et styles d'un élément
│   ├── check-discord.mjs · check-db.mjs · backfill-revisions.mjs
│   ├── check-text.mjs      # caractères et mots corrompus dans le contenu
│   ├── generate_historical_flag.mjs  # déclinaisons du drapeau Ier/IIe
│   ├── link-roster.mjs     # rattache les pseudos Discord aux fiches (npm run link:roster)
│   ├── cache-discord-avatars.mjs  # télécharge les portraits dans public/avatars
│   └── migrate.mjs           # migrations de charges constitutionnelles
├── migrations/               # un fichier par évolution de la Constitution
├── data/                     # articles.json + revisions.json (JSON local)
└── src/
    ├── middleware.ts         # protection des zones d'édition
    ├── app/
    │   ├── layout.tsx        # polices (3, variables), métadonnées, script de thème
    │   ├── template.tsx      # rejoué à chaque navigation → transition de page
    │   ├── globals.css       # variables des deux thèmes + typographie de l'article
    │   │                     # (`.markdown`, `.excerpt`) + animations
    │   ├── page.tsx · constitution/ · wiki/ (+ versions) · personnalites/
    │   ├── institutions/ · tags/ · plan/ · recherche/ · connexion/ · credits/
    │   ├── admin/            # tableau de bord, création, édition, historique, activité
    │   └── api/              # auth, articles (CRUD, export, révisions, restauration),
    │                         # search, analysis, ai, sync/discord, sync/bot,
    │                         # cron/discord, seed, health
    ├── components/           # Header, ThemeToggle, Sidebar, SearchBar, MarkdownRenderer,
    │                         # Infobox, FramedImage, TableOfContents, ArticleToolbar,
    │                         # ReadingProgress, PdfPreview, RoleBadge, admin/*
    │                         # (dont InfoboxEditor, InstallSeedButton)
    │                         # RoleBadge = charge constitutionnelle,
    │                         # DiscordRoleBadge = rôle Discord (pastille)
    └── lib/                  # articles-store, store (json|pg|environment), auth, jwt, users,
                               # discord, discord-avatar-url, avatar-url, avatar-cache,
                               # search, link-graph, diff, text-analysis, markdown, infobox,
                               # slug, theme, rate-limit, request-security, constants,
                               # sync/discord, roster, gemini, ai/*,
                               # seed-data, seed-lore, seed-lore-figures, seed-history,
                               # seed-chapitres, seed-constitutions, fingerprint,
                               # citizen-pages (fiches citoyens automatiques),
                               # roster (config partagée), avatar-url, bot-signature
├── shared/
│   └── roster.json          # ⚠️ SOURCE UNIQUE : personnages, roles, historique
├── bot/                     # bot Discord autonome (discord.js) qui pousse vers le wiki
└── public/avatars/          # cache local des portraits (ignore par git)
```

---

## 🛠️ Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run check` | Vérifie le diff **et** l'assistant de rédaction |
| `npm run check:diff` | Cas de test de l'algorithme de comparaison des versions |
| `npm run check:analysis` | Cas de test de l'assistant (doublons, checklist, liens, résumé) |
| `npm run check:text` | Détecte les caractères et mots corrompus dans les fichiers de contenu (cyrillique, CJK, mots anglais, espaces manquantes) |
| `npm run check:markdown` | 20 tests du moteur Markdown : liens wiki en tableau, tubes échappés, listes imbriquées, ancres uniques, repli des lignes, neutralisation de `javascript:` |
| `npm run check:render` | Audit de rendu réel (Edge headless) en mobile **et** desktop : débordements, contrastes, cibles tactiles, titres, `alt`, **erreurs de console** |
| `npm run check:oeuf` | 86 épreuves de la logique de l'œuf : les mots qui ouvrent, ceux qui n'ouvrent pas, la normalisation clavier, le code Konami, les quinze verrous du registre |
| `npm run check:oeuf:navigateur` | L'œuf dans un vrai moteur : la page fermée ne montre rien, le mot ouvre la cache, le second niveau se révèle, un des quinze s'ouvre et se compte |
| `THEME=dark npm run check:render` | Le même audit en forçant le thème sombre (ou `light`) |
| `npm run check:theme` | Vérifie que la palette bascule entre les deux thèmes et qu'aucune erreur d'hydratation n'apparaît |
| `npm run check:discord` | Diagnostic de la configuration Discord (token, intent, rôles) |
| `npm run check:db` | Diagnostic PostgreSQL (connexion, tables, écriture) |
| `npm run check:deploy` | **Contrôle de préparation au déploiement** : variables d'environnement, secrets, base, tâches planifiées, cohérence du contenu. `VERCEL=1 npm run check:deploy` force le mode plateforme éphémère. `--strict` fait échouer sur les avertissements |
| `npm run link:roster` | Compare `shared/roster.json` aux pseudos réels du serveur et **propose** le rattachement de chaque fiche. `--write` pour écrire ; aucune ambiguïté n'est résolue à votre place |
| `npm run cache:avatars` | Télécharge les portraits des fiches dans `public/avatars/` (User-Agent requis par le CDN Discord), **chacun dans son format réel** (PNG, JPEG, GIF ou WebP). `--dry` pour n'écrire rien |
| `npm run backfill` | Crée la révision « Création » des articles qui n'ont pas d'historique |
| `npm run assets` | Régénère favicon / WebP / OpenGraph depuis `flag.png` |
| `npm run assets:history` | Régénère les déclinaisons web du **drapeau du Ier et du IIe Delphinat** |
| `npm run hash-password -- "mot de passe"` | Produit un hash scrypt à coller dans `WIKI_USERS` |
| `npm run migrate` | Migrations de données (voir ci-dessous) |
| `npm run migrate:plan` | Liste les migrations en attente sans rien écrire |
| `curl localhost:3000/api/health` | Sonde de santé (stockage, articles, Discord) |
| `python scripts/extract_pdf_text.py Constitution.pdf` | Retranscrit le texte du PDF (contrôle d'intégrité) |

---

## 🔀 Migrations : quand la Constitution évolue

Les droits d'édition sont adossés aux charges de l'article P-1. Si une charge est **renommée, fusionnée ou supprimée**, les données doivent suivre sans perte.

Le wiki embarque un petit exécuteur de migrations, sur le principe d'un fil d'Alembic : **un fichier par évolution**, un **registre** de celles qui ont été appliquées, une exécution **unique et vérifiable**.

```bash
npm run migrate            # list / status des migrations
npm run migrate:plan       # ce qui serait appliqué
node scripts/migrate.mjs up --dry-run   # simulation, n'écrit rien
node scripts/migrate.mjs up --yes       # application
```

**Écrire une migration** — copiez `migrations/0001_exemple_charge.mjs` et renseignez les correspondances :

```js
export default {
  id: "0002_baillit_bailli",
  description: "La charge Baillit devient Bailli (Constitution révisée).",
  roles: { baillit: "bailli" },                       // WIKI_USERS (.env)
  authors: { "Rédaction du wiki": "Rédaction du wiki" }, // champ `author` des données
};
```

**Ce que la migration touche**

| Cible | Effet |
| --- | --- |
| `.env` → `WIKI_USERS` | Charge remplacée pour chaque compte. **Les mots de passe ne sont jamais lus ni réécrits.** |
| `data/articles.json`, `data/revisions.json` | Champ `author` renommé (libellés exacts) |
| PostgreSQL (`DATABASE_URL`) | Colonnes `author` des tables `articles` et `revisions`, plus un registre `schema_migrations` |
| `data/migrations.json` | Journal des migrations appliquées (une seule fois chacune) |

**Garde-fous**

- **Sauvegarde automatique** dans `data/backup-<horodatage>/` (`.env`, `articles.json`, `revisions.json`) avant toute écriture.
- **Vérification préalable** : la nouvelle charge doit exister dans `USER_ROLES` (`src/lib/types.ts`) — sinon la migration s'arrête avec le nom du rôle manquant. Ajoutez aussi son entrée `ROLE_INFO` (intitulé et extrait de Constitution justifiant les droits).
- **`--dry-run`** par défaut, `--yes` requis pour écrire.
- **Idempotent** : une migration déjà présente dans le registre n'est jamais rejouée.

---

## ☁️ Déploiement sur Vercel

Le projet est prêt pour Vercel : `vercel.json` fixe la région, la durée des fonctions et la tâche planifiée. Le point qui décide de tout le reste est la **base de données**.

### La règle à comprendre avant tout

Vercel est **sans état** : chaque invocation de fonction reçoit un système de fichiers *vide*, distinct de celui de la précédente, et en lecture seule. Le wiki est un site **éditable**, et `data/` est ignoré par Git.

Conséquence, sans ambiguïté : **sans `DATABASE_URL`, le déploiement fonctionne et le site s'affiche vide**, et toute édition faite depuis `/admin` disparaît. Ce n'est pas une panne visible — c'est le pire cas, parce que tout semble marcher.

Le wiki détecte cette situation et la refuse explicitement :

- `npm run check:deploy` **échoue** si `DATABASE_URL` manque sur une plateforme Vercel ;
- le magasin JSON **lève une erreur explicite** s'il tentait d'écrire dans un tel environnement, plutôt que de laisser croire que l'enregistrement a réussi ;
- `/api/health` répond **503** avec la liste des problèmes : un moniteur de disponibilité le voit immédiatement.

### Marche à suivre

**1. Créer la base.** Neon, Supabase ou Railway proposent une PostgreSQL gratuite. Conservez l'URL de connexion — elle devient `DATABASE_URL`. Le schéma (tables, colonnes, index) est **créé automatiquement au premier accès** : aucune migration manuelle n'est nécessaire.

**2. Relier le dépôt et définir les variables.** Dans *Vercel → Settings → Environment Variables* :

| Variable | Requise | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | **oui** | PostgreSQL. Sans elle, rien ne tient. |
| `AUTH_SECRET` | **oui** | Signature des sessions d'édition (32 caractères mini). |
| `SITE_URL` | facultatif | `https://votre-domaine`. Facultatif sur Vercel : l'URL est déduite de `VERCEL_PROJECT_PRODUCTION_URL`. À renseigner pour un domaine personnalisé. |
| `WIKI_USERS` | **oui** | `identifiant:motdepasse:charge`, séparés par des virgules. Hachez les mots de passe avec `npm run hash-password`. |
| `CRON_SECRET` | oui | Active la synchronisation Discord planifiée. |
| `DISCORD_BOT_TOKEN` | recommandé | Portraits et rôles réels. |
| `DISCORD_GUILD_ID` | recommandé | Identifiant du serveur. |
| `GEMINI_API_KEY` | facultatif | Analyse automatique des salons de parti. |

Définissez-les pour les trois environnements (*Production*, *Preview*, *Development*) ou du moins pour *Production*.

**3. Vérifier avant de pousser.**

```bash
npm run build            # le build Vercel exécutera exactement ceci
npm run check            # diff, analyse, texte
npm run check:deploy     # variables d'environnement, base, cron
```

`vercel.json` enchaîne le contrôle et le build : `node scripts/check-deploy.mjs --env && npm run build`. Un déploiement mal configuré **échoue au build** plutôt que de produire un site en ligne et vide.

**4. Premier contenu.** La base est vide au premier déploiement : connectez-vous en Dauphin sur `/admin` et lancez *Installer / mettre à niveau*. Les articles sont idempotents — le bouton ne duplique rien et ne réécrit pas vos retouches.

**5. Vérifier en ligne.**

```bash
curl -i https://votre-domaine/api/health
```

`status: ok` et un nombre d'articles non nul : le wiki est réellement déployé, pas seulement en ligne.

### Synchronisation automatique

`vercel.json` déclare une tâche horaire (`/api/cron/discord`, à la minute 17). Sans elle, le wiki afficherait des portraits et des rôles figés au jour du déploiement, et les nouveaux membres n'auraient pas de fiche.

La route est protégée par `CRON_SECRET`, que Vercel transmet dans l'en-tête `Authorization`. La comparaison se fait en temps constant. **Sans `CRON_SECRET`, elle répond 503 et se désactive d'elle-même** plutôt que de s'ouvrir à quiconque trouve l'URL.

Sur le plan Hobby, Vercel limite les tâches à une exécution par jour : l'heure est alors ajustée à votre compte. Pour une fréquence horaire, il faut un plan Pro.

### Ce qui n'est volontairement pas déployé

- **`data/`** — le contenu vit en base. Rien à versionner, et c'est ce qui évite d'embarquer du contenu périmé dans le dépôt.
- **`public/avatars/`** — les portraits en cache sont des données personnelles, régénérables par `npm run cache:avatars`. Sur Vercel, les portraits viennent **en direct** de l'API Discord ; le cache n'est qu'un repli local, utile hors ligne.
- **`.env`** — jamais versionné. Tout passe par les variables d'environnement de Vercel.

### Si vous préférez ne pas utiliser PostgreSQL

Le wiki reste consultable en lecture seule sur Vercel avec `data/` : Lancez `npm run cache:avatars` et engagez le contenu en JSON dans le dépôt. **Mais l'édition sera inutilisable** et chaque requête pourrait servir un contenu différent. Pour un wiki que la rédaction fait vivre, ce n'est pas un compromis tenable — d'où le refus explicite par défaut.

---

## 📱 Hébergement sur une tablette Android (Termux)

Le wiki peut tourner sur une tablette rootée, sous un sous-domaine DuckDNS, en
HTTPS avec renouvellement automatique du certificat. Le guide complet est dans
[`deploy/termux/LISEZ-MOI.md`](deploy/termux/LISEZ-MOI.md).

Ce qu'il faut savoir avant de choisir cette voie :

- **C'est un hébergement de maison.** Le wiki n'est joignable que lorsque la
  tablette est allumée, connectée, et qu'Android ne suspend pas Termux. Il n'y a
  ni CDN, ni reprise sur panne, ni supervision ;
- **Le stockage JSON suffit**, et c'est même préférable : rien à exploiter, et
  une sauvegarde se réduit à copier `data/`. Vérifié dans cette configuration :
  `durable: true`, 60 articles, toutes les pages servies. PostgreSQL reste
  possible — `DATABASE_URL` fonctionne aussi bien sur une tablette ;
- **Le port 80 doit être joignable** depuis Internet, sans quoi Let's Encrypt ne
  peut pas répondre et il n'y a pas de certificat. Cela suppose une redirection
  de port sur la box, et une IP fixe pour la tablette ;
- **Caddy doit s'exécuter dans l'environnement** où se trouve `WIKI_DOMAINE` : le
  Caddyfile ne lit pas le fichier `env` du projet. D'où un service dédié.

### Le mode HTTP d'abord

Un seul réglage décide si le site est accessible : `WIKI_SCHEME`, dans le `env`
du service `caddy`.

| `WIKI_SCHEME` | Effet |
|---|---|
| `http://` | HTTP simple sur le port 80. Aucun certificat demandé, aucune redirection. **C'est le mode de départ.** |
| `https://` | HTTPS automatique, certificat obtenu et renouvelé par Caddy, redirection du HTTP vers le HTTPS. |

Le point de départ est `http://` pour une raison précise. Dès qu'un nom de
domaine figure dans la configuration, Caddy active le HTTPS automatique **et**
redirige le HTTP vers le HTTPS. Or le certificat ne peut être obtenu que si le
port 80 est joignable. Tant que la redirection de port n'est pas faite sur la
box, le navigateur est renvoyé vers un HTTPS inexistant : le site paraît mort,
alors que la box n'est simplement pas encore configurée. En `http://`, ce renvoi
n'a pas lieu et le wiki répond — on peut donc tout vérifier avant de toucher à la
box.

```bash
# dans $PREFIX/var/service/caddy/env
WIKI_DOMAINE=exemple.duckdns.org
WIKI_SCHEME=http://

sv restart caddy
curl -i http://exemple.duckdns.org/api/health
```

Une ligne `200 OK` : tout va bien. Un `301` ou un `308` vers `https://` signifie
que `WIKI_SCHEME` est resté à `https://`.

Une fois le port 80 redirigé sur la box et le site joignable de l'extérieur, on
passe à `https://` et on `sv restart caddy` : Caddy obtient le certificat seul.
Si l'obtention échoue, on rebascule en `http://` et le site redevient accessible.

Quatre services Termux sont fournis :

| Service | Rôle |
|---|---|
| `wiki` | lance `next start` et le relance s'il tombe |
| `caddy` | reverse proxy, certificat HTTPS, élévation root si le port 80 l'exige |
| `sync-discord` | appelle la synchronisation une fois par heure |
| `duckdns` | maintient l'enregistrement à jour quand l'IP change |

```bash
PREFIX=/data/data/com.termux/files/usr
for service in wiki sync-discord duckdns caddy; do
  mkdir -p "$PREFIX/var/service/$service"
  cp "deploy/termux/run-$service" "$PREFIX/var/service/$service/run"
  chmod +x "$PREFIX/var/service/$service/run"
  cp deploy/termux/env.exemple "$PREFIX/var/service/$service/env"
  sv-enable "$service"
done
sv up wiki
```

## 🚀 Mise en ligne — liste de contrôle

Le site est prêt à être déployé tel quel ; ces étapes sont celles qui ne peuvent pas être automatisées.

1. **Secrets.** Générer un `AUTH_SECRET` unique (`openssl rand -base64 32`) et le définir dans l'environnement de production — jamais dans le dépôt. Sur Vercel, chaque variable se définit dans *Settings → Environment Variables* : voir [Déploiement sur Vercel](#️-déploiement-sur-vercel).
2. **Comptes.** Remplacer les comptes de démonstration de `.env` par les charges réelles, avec des **mots de passe hachés** (`npm run hash-password`). Le mot de passe en clair de `.env` est un artefact de développement local.
3. **HTTPS.** Servir le site en HTTPS : le cookie de session passe alors en `secure` automatiquement, et HSTS s'active (`NODE_ENV=production`).
4. **`SITE_URL`.** Définir l'URL publique (sitemap, OpenGraph, partages sociaux).
5. **Discord.** Renseigner `DISCORD_BOT_TOKEN` et `DISCORD_GUILD_ID` puis lancer la synchronisation depuis `/admin` : les pages *Personnalités* et *Institutions* passent de « non synchronisé » aux données réelles.
6. **Stockage.** En production, renseigner `DATABASE_URL` (PostgreSQL) plutôt que les fichiers JSON : sauvegardes faciles, requêtes indexées, compatible avec un déploiement multi-instances. **Sur Vercel ce n'est pas facultatif** — la plateforme ne conserve aucun fichier d'une invocation à l'autre. Le schéma et les colonnes `infobox` sont créés au premier accès.
7. **Contenu.** Lancer *Installer / mettre à niveau* dans `/admin` pour publier les derniers articles officiels et leurs infoboxes.
8. **Sauvegardes.** Sauvegarder `data/` (mode JSON) ou la base PostgreSQL : c'est le contenu du wiki. L'export JSON complet est disponible sur `/api/articles/export`.
9. **Vérifications avant ouverture.** `npm run build`, puis `npm run check` et `npm run check:deploy`, `npm run check:render` (avec et sans `THEME`) et `npm run check:theme`.
10. **Surveillance.** `/api/health` renvoie l'état du stockage, le nombre d'articles, la synchronisation Discord et la **configuration de déploiement** (`problems` et `warnings`). Un déploiement dont le contenu ne peut pas durer y est signalé en `503` : à interroger périodiquement, ou depuis un service de uptime.

---

## ✍️ Crédits

Ce wiki et le bot Discord qui le synchronise sont l'**œuvre d'Eitam** — conception, développement et entretien. Son nom figure dans les métadonnées du site, au pied de chaque page, sur `/credits` et dans sa propre fiche : une encyclopédie doit nommer son auteur.

Les textes fondateurs sont encodés par ordre de préséance (Constitution en vigueur, puis les deux règnes précédentes, puis le récit attribué de la rédaction) ; les identités, rôles, ancienneté et photos de profil sont lus **en direct** sur l'API du serveur, jamais saisis à la main. Lorsqu'une information n'est pas documentée, l'article l'indique au lieu de la combler.

Le nom de l'auteur et la liste des contributions sont centralisés dans `CREDITS` (`src/lib/constants.ts`) : **une seule source à modifier**, reprise par le pied de page, la page `/credits` et les métadonnées.

---

*Wiki du IIIe Delphinat de Gratianopolis — discord.gg/gratianopolis* ⚜️
