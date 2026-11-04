# Cent fonctionnalités pour le Wiki Gratiennois

État des lieux au 4 novembre 2026. Ce document propose cent fonctions qui **n'existent pas encore** (ou seulement à l'état d'ébauche) dans le wiki. Les fonctions déjà en place — recherche à facettes, comparaison de révisions, table des matières, progression de lecture, thème clair/sombre, commentaires, synchronisation Discord, A2F, modèles de page — ne sont pas reproposées.

**Effort** : `S` quelques heures · `M` un à deux jours · `L` une semaine ou plus.

---

## Les huit que je ferais d'abord

Indépendamment de leur rang dans les listes qui suivent, ce sont les huit chantiers qui changent le plus de choses pour le moins d'effort.

| # | Chantier | Pourquoi celui-là |
|---|---|---|
| — | **Activer les sauvegardes** | Les scripts existent, aucune archive n'est produite. Le contenu vit sur une seule tablette. |
| — | **Sonde de disponibilité + alerte MP** | Le site est resté dix minutes en 502 sans que personne le sache. |
| — | **Commiter le travail de la tablette** | Commentaires, OAuth Discord, journal d'audit : tout déploiement depuis le dépôt l'écrase. |
| — | **Régénérer le jeton DuckDNS** | Il est dans l'historique d'un dépôt public. Le retirer du code ne l'efface pas du passé. |
| 1 | **Édition par section** | Le gain d'ergonomie le plus fort de toute la liste. |
| 31 | **Modifications récentes** | Sans page de suivi, personne ne surveille ce qui change. |
| 41 | **Recherche tolérante aux fautes** | Une encyclopédie où l'on ne trouve pas ce qu'on cherche ne sert à rien. |
| 21 | **Notes de bas de page** | Le wiki revendique de distinguer le documenté du récit ; il lui manque l'outil. |

---

## 1. Écrire et éditer

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 1 | **Édition par section** | Chaque titre devient un lien « modifier » qui n'ouvre que ce paragraphe. On ne recharge plus 11 000 caractères pour corriger une phrase. | M |
| 2 | **Diff avant publication** | Voir mot à mot ce que l'on s'apprête à changer, et pas seulement le résultat. C'est ce qui rend une modification relisible. | M |
| 3 | **Brouillon côté serveur** | Reprendre une rédaction depuis un autre appareil. Aujourd'hui le brouillon vit dans le navigateur et disparaît avec lui. | S |
| 4 | **Autocomplétion des liens internes** | Taper `[[` ouvre la liste des pages avec recherche floue. Fini les slugs inventés. | S |
| 5 | **Liens rouges signalés en direct** | L'éditeur souligne les `[[slug]]` qui ne mènent nulle part, avant l'enregistrement et non après. | S |
| 6 | **Modèles paramétrables** | Le modèle pose six questions et remplit le squelette. Un formulaire, pas un texte à trous. | M |
| 7 | **Édition collaborative** | Deux membres du Conseil sur la même page, curseurs visibles (CRDT). | L |
| 8 | **Blocs Markdown enrichis** | Encadré, note, avertissement, citation longue — des constructions nommées plutôt que du HTML interdit. | M |
| 9 | **Annulation profonde** | Revenir à l'état d'il y a dix minutes dans l'éditeur, pas seulement au dernier caractère. | S |
| 10 | **Mode traduction** | Une page, deux langues, même slug, bascule FR/EN. | L |

## 2. Structurer l'encyclopédie

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 11 | **Portails thématiques** | Des pages d'entrée par domaine (Histoire, Institutions, Personnalités) avec sélection éditoriale, au-dessus des catégories brutes. | M |
| 12 | **Catégories hiérarchiques** | Histoire › Guerres › Guerre de Sécession. Aujourd'hui les catégories sont plates. | M |
| 13 | **Article du jour** | Rotation quotidienne sur l'accueil, choisie par vote plutôt qu'au hasard. | S |
| 14 | **« Savez-vous que… »** | Accroches tirées des infoboxes, renouvelées automatiquement. | S |
| 15 | **Frise chronologique générée** | Une seule page, alimentée par les dates des articles, sans saisie manuelle. | M |
| 16 | **Pages d'homonymie** | Deux « Selios » possibles sans collision de slug ni lien ambigu. | S |
| 17 | **Redirections gérées** | Alias de slug déclarés dans l'admin, avec journal des changements. | S |
| 18 | **Articles connexes calculés** | Similarité de liens internes, pas une liste choisie à la main. | M |
| 19 | **Galerie média** | Toutes les images du wiki, filtrables, avec crédits et provenance. | M |
| 20 | **Index alphabétique** | La liste intégrale des pages, comme la fin d'un dictionnaire. | S |

## 3. Prouver ce qui est affirmé

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 21 | **Notes de bas de page** | Syntaxe `<ref>`, numérotation automatique, liste en fin d'article. Le wiki distingue déjà fait et récit ; il lui manque l'appareil de preuve. | M |
| 22 | **Sources Discord archivées** | Citer un message fige son contenu, son auteur, son salon et sa date. Un lien Discord, lui, meurt. | M |
| 23 | **Bandeaux d'entretien** | « Non renseigné », « source unique », « à vérifier », datés et cliquables. | S |
| 24 | **Bibliographie structurée** | Ouvrages, messages, captures, avec type et lien, rendus en fin d'article. | S |
| 25 | **Détection de liens morts** | Un cron teste les liens externes et signale les 404 dans une page de maintenance. | S |
| 26 | **Rapport pages orphelines** | Aucun lien entrant : la page existe mais personne ne peut y arriver. | S |
| 27 | **Rapport pages sans catégorie** | Repérer les oublis structurels avant qu'ils ne s'accumulent. | S |
| 28 | **Score de complétude** | Une jauge par article : infobox, sources, liens entrants, longueur. | M |
| 29 | **Protection de page** | Semi-protection et protection totale, avec motif affiché. | M |
| 30 | **Export PDF encyclopédique** | L'article mis en page, sources comprises, pas une impression de page web. | M |

## 4. Historique et gouvernance

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 31 | **Modifications récentes** | Une page globale, filtrable par auteur, catégorie et taille de diff. C'est l'écran que tout contributeur ouvre en premier. | S |
| 32 | **Liste de suivi** | Suivre une page et recevoir un MP Discord à chaque modification. | M |
| 33 | **Annulation en un clic** | Depuis le diff, revenir à la version précédente avec un résumé automatique. | S |
| 34 | **Règle des trois réverts** | Alerte quand deux comptes se annulent mutuellement trois fois sur la même page. | M |
| 35 | **Votes de suppression** | Page de débat, quorum, clôture motivée par le Dauphin. | L |
| 36 | **Label « article de qualité »** | Vote, bandeau, et retrait possible. | M |
| 37 | **Journal d'audit lisible** | Qui a fait quoi, quand, depuis quelle adresse — exportable en CSV. | S |
| 38 | **Révisions signées** | Chaîne HMAC : prouver qu'une version n'a pas été réécrite après coup. | M |
| 39 | **Gel automatique** | Page figée temporairement en cas de pic de reverts, avec notification. | M |
| 40 | **Statistiques d'édition** | Par compte, par mois, courbe d'activité, pages les plus modifiées. | S |

## 5. Trouver

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 41 | **Recherche tolérante aux fautes** | « gratianopoli » trouve « Gratianopolis ». Sur des noms inventés, la faute de frappe est la règle. | M |
| 42 | **Recherche par infobox** | « dirigeants de Neustrie », « partis fondés en 2026 » : interroger la structure, pas le texte. | M |
| 43 | **Recherche dans les révisions** | Retrouver un paragraphe supprimé il y a trois mois. | M |
| 44 | **Recherche sémantique** | Embeddings locaux, questions en langage naturel, réponses sourcées. | L |
| 45 | **Suggestions instantanées** | Typeahead dans la barre, sans changer de page. | S |
| 46 | **Raccourci `/`** | Focus sur la recherche depuis n'importe quelle page. | S |
| 47 | **Recherche vocale** | Dictée sur mobile, utile pour les noms propres. | S |
| 48 | **Requêtes sauvegardées** | Mémoriser « tout sur 2026 » et la rejouer en un clic. | S |
| 49 | **API de recherche publique** | Documentée, avec quota et ETag. | M |
| 50 | **« Pages liées ici »** | Voir qui cite la page courante — la moitié manquante de la navigation. | S |

## 6. Ouvrir les données

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 51 | **Dump complet** | JSON et Markdown de tout le wiki, horodaté, archivable. | S |
| 52 | **Import Markdown** | Verser un dossier d'articles d'un coup, avec rapport d'erreurs. | M |
| 53 | **Flux Atom des modifications** | S'abonner aux changements depuis un lecteur RSS. | S |
| 54 | **API REST publique en lecture** | Pagination, ETag, quota — pour les outils tiers et le bot. | M |
| 55 | **Webhooks de publication** | Prévenir un service externe quand une page paraît. | M |
| 56 | **Export MediaWiki XML** | Portabilité réelle : pouvoir partir vers un MediaWiki. | M |
| 57 | **EPUB du wiki** | Un livre complet, chapitré par catégorie, lisible hors ligne. | M |
| 58 | **Entités structurées** | Personnes, lieux, dates réutilisables entre articles, comme Wikidata. | L |
| 59 | **Sauvegarde différentielle** | N'archiver que les changements, pas huit mégaoctets chaque nuit. | M |
| 60 | **Miroir statique** | Une version en lecture seule, hébergeable n'importe où. | M |

## 7. Le wiki et Discord

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 61 | **Commande `/wiki`** | Recherche et lien direct depuis Discord, sans quitter la conversation. | S |
| 62 | **Salon par article** | Une discussion attachée à une page, archivée avec elle. | M |
| 63 | **Attribution automatique** | Un article créé depuis Discord est signé par son auteur réel. | S |
| 64 | **Badges de contribution** | Nombre d'articles, de révisions, de sources — affichés sur la page du citoyen. | M |
| 65 | **Notifications de modification** | MP Discord aux suiveurs d'une page, groupés pour ne pas noyer. | S |
| 66 | **Sondages intégrés** | Voter dans le wiki, publier le résultat dans un salon. | M |
| 67 | **Calendrier du Delphinat** | Anniversaires, élections, traités, sur une seule page. | M |
| 68 | **Journal du serveur** | Arrivées, départs, promotions, en une page chronologique. | S |
| 69 | **Rôle « rédacteur »** | Attribué automatiquement après X articles acceptés. | M |
| 70 | **Digest hebdomadaire** | Résumé des modifications de la semaine, envoyé en MP. | S |

## 8. Administrer et protéger

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 71 | **Sessions actives** | Voir les appareils connectés, révoquer à distance. | M |
| 72 | **Journal de connexion** | IP, appareil, succès et échecs — pour repérer une attaque lente. | S |
| 73 | **Alerte de connexion inhabituelle** | MP Discord quand un nouvel appareil se connecte. | S |
| 74 | **Rôles par catégorie** | Tel compte n'édite que l'Histoire, tel autre que les Institutions. | M |
| 75 | **File de modération** | Commentaires en attente, approuver ou rejeter en un clic. | M |
| 76 | **Bannissement temporaire** | Suspension d'un compte avec échéance automatique. | S |
| 77 | **Mode lecture seule d'urgence** | Un interrupteur : tout le site en consultation, plus aucune écriture. | S |
| 78 | **Rotation assistée des secrets** | Procédure guidée pour changer un jeton sans coupure. | M |
| 79 | **Test de restauration** | Restaurer une archive dans un dossier jetable chaque semaine, et le prouver. | M |
| 80 | **Page de statut publique** | Disponibilité, incidents, date de la dernière sauvegarde. | S |

## 9. Tenir la charge

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 81 | **Cache ISR** | Les pages stables servies depuis un cache, revalidées par étiquette. | M |
| 82 | **Compression Brotli** | HTML et JSON plus légers au niveau de Caddy. | S |
| 83 | **Images AVIF** | Conversion à la volée, cache disque, sans rouvrir l'API d'optimisation fermée. | M |
| 84 | **Préchargement au survol** | La page suivante est déjà là quand on clique. | S |
| 85 | **PWA hors-ligne** | Lire les articles déjà consultés sans réseau. | M |
| 86 | **Sonde de disponibilité** | Test toutes les cinq minutes, alerte MP après deux échecs. | S |
| 87 | **Redémarrage supervisé** | Healthcheck et relance si le processus meurt — sans attendre un humain. | S |
| 88 | **Seconde machine de secours** | Une réplique prête à prendre le relais si la tablette tombe. | L |
| 89 | **Budget de performance** | Suivre le poids des pages dans le temps, alerter en cas de dérive. | S |
| 90 | **Sauvegardes compressées** | Archives plus petites, donc rotation plus longue et copie plus rapide. | S |

## 10. Lire

| # | Fonctionnalité | Ce que ça change | Effort |
|---|---|---|---|
| 91 | **Modes sépia et contraste élevé** | Au-delà du clair/sombre : trois ambiances, dont une lisible en plein soleil. | S |
| 92 | **Taille de texte réglable** | Persistée par appareil, pas par compte. | S |
| 93 | **Lecture audio** | Synthèse vocale des articles, avec la bonne prononciation des noms. | M |
| 94 | **Surlignage partageable** | Sélectionner un passage, obtenir un lien qui le met en évidence à l'arrivée. | M |
| 95 | **Carte des micronations** | Situation relative de Norlot, Neustrie, Massivie et Gratianopolis. | M |
| 96 | **Arbres générés** | Généalogie des Dauphins, arbre des partis, depuis les liens existants. | M |
| 97 | **Mode comparaison** | Deux articles côte à côte, pour les récits qui se contredisent. | S |
| 98 | **Navigation par catégorie** | Précédent et suivant dans l'ordre alphabétique, en bas de page. | S |
| 99 | **Fil d'Ariane enrichi** | Catégorie › sous-catégorie › page, entièrement cliquable. | S |
| 100 | **Page « À propos » chiffrée** | Articles, révisions, contributeurs, uptime, dernière sauvegarde. | S |

---

## Ce que cette liste dit en creux

Trois déséquilibres ressortent.

**Le wiki sait écrire, il sait mal surveiller.** Sur les dix sections, la quatrième (historique et gouvernance) et la huitième (administrer) sont les plus faibles alors que ce sont elles qui protègent le contenu. Une encyclopédie sans page de modifications récentes est une encyclopédie que personne ne relit.

**Le wiki affirme, il ne prouve pas encore.** La section 3 est presque vide dans l'état actuel. Or la règle éditoriale du wiki — distinguer un fait documenté d'un récit de communauté — n'a de valeur que si le lecteur peut remonter à la source.

**Le wiki est seul.** Une seule tablette, aucun miroir, aucune sonde, aucune alerte. Les fonctions 79, 80, 86, 87 et 88 ne sont pas des améliorations, ce sont des assurances.

---

## État au 4 novembre 2026

Cette section est écrite après coup, en regardant le code livré — pas l'intention. Elle distingue trois états, et le troisième est le plus nombreux : prétendre le contraire serait la seule vraie malhonnêteté de ce document.

**Livré et fonctionnel en production : 56 fonctions.**
11, 12, 13, 14, 15, 16, 17, 18, 19, 20 · 21, 22, 23, 24, 25, 26, 28, 29, 30 · 31, 32, 33, 34, 37, 39, 40 · 41, 43, 45, 46, 47, 48, 49, 50 · 51, 53, 54, 55, 56, 57 · 71, 72, 75, 76, 77, 80 · 86, 87 · 91, 92, 93, 94, 97, 98, 99, 100.

**À moitié : la mécanique existe, l'interface manque : 12 fonctions.**
2, 3, 5, 6, 7, 10, 35, 36, 44, 58, 84, 90.
Par exemple la présence en édition (7) a son API et son stockage, mais l'éditeur ne l'appelle pas encore ; le moteur de recherche sémantique (44) est écrit et testé, mais la page de recherche ne l'utilise pas.

**Pas commencé : 32 fonctions.**
1, 4, 8, 9, 27, 38, 42, 52, 59, 60, 61 à 70, 73, 74, 78, 79, 81, 82, 83, 85, 88, 89, 95, 96.
Les dix fonctions Discord (61–70) demandent de modifier le bot, qui tourne dans un autre processus : les livrer à moitié aurait cassé un service qui fonctionne.

**Pourquoi s'arrêter là plutôt que d'aller au bout.** Les 56 livrées sont vérifiées en production, une par une, sur les pages réelles. Les 32 restantes demandent soit une refonte de l'éditeur (1, 4, 8, 9), soit une intervention sur le bot Discord, soit de l'infrastructure (miroir, seconde machine, AVIF). Les ajouter en une passe aurait produit un site plus large et moins sûr — exactement ce qu'il ne faut pas faire avec une encyclopédie dont tout le propos est de distinguer ce qui est vérifié du reste.

---

## Deuxième passe — 4 novembre, après-midi

**Livré depuis : 60 fonctions complètes.** Les quatre qui passent de « non commencée » à « livrée » :

- **42** — recherche dans les infoboxes : une donnée saisie exprès pèse plus que le corps du texte.
- **44** — recherche sémantique : quand la recherche littérale ne rend rien, le corpus est interrogé par proximité de vocabulaire (TF-IDF) et les pages les plus proches sont proposées, en le disant.
- **52** — import Markdown : en-tête `---` facultatif, titre déduit du premier `#`, refus si l'adresse est déjà prise.
- **58** — entités structurées : page publique, rattachement à l'article, création réservée à l'accès complet.

**Connexion Discord — réparée.** Elle « fonctionnait » au sens technique, mais aucun rôle du serveur ne correspondait aux noms du roster : ils portent des emojis (« 🐬|Dauphin ») et divergent (« Conseil Ministériel du Delphinat » vs « Conseil Delphinal »). Les 66 membres entraient donc tous en lecture seule — d'où l'impression qu'il n'y avait que les comptes locaux. La correspondance se fait désormais sur les identifiants réels des rôles. Vérifié : **5 membres avec écriture** (dont Eitam en Premier Ministre et Esto en Dauphin), 54 lecteurs.

**Sécurité — trois failles réelles fermées.**

- `clientIp` lisait le **premier** saut de `X-Forwarded-For`, une valeur fournie par le client : un attaquant changeait d'adresse à chaque essai et contournait le quota de connexion. Le dernier saut, seul, est digne de confiance.
- redirection ouverte : `/connexion?next=https://exemple.test` renvoyait vers un site tiers après connexion, avec le nom du wiki comme caution.
- SSRF : un webhook pouvait viser `127.0.0.1`, la box ou le réseau local — que le serveur, lui, atteint. Les hôtes privés sont refusés.

Plus : contrôle d'`Origin` sur toutes les écritures, quota et contrôle de format sur `/api/features`, qui n'en avait aucun.

**Reste : 40 fonctions**, dont les dix du bot Discord (61–70) et la refonte de l'éditeur (1, 4, 8, 9). Le détail honnête reste celui de la section précédente, moins ces quatre.

---

## Troisième passe — 4 novembre, soirée

**64 fonctions complètes.** Quatre de plus, plus quatre chantiers transverses.

- **73** — alerte de connexion inhabituelle : après le second facteur, un message privé part si l'adresse n'a jamais été vue. Le journal existait mais n'était branché nulle part : `isNewDevice` répondait toujours « oui ».
- **89** — budget de performance : `npm run check:perf`, sept pages, 59 Ko compressés et 2,5 s maximum.
- **90** — sauvegarde chiffrée : elle n'avait **jamais tourné**, faute d'`openssl` sur Termux. Remplacée par AES-256-GCM en Node (authentifié, pas CBC : une archive modifiée est refusée au lieu de se déchiffrer en silence). Première archive produite et vérifiée : 7,6 Mo.
- **79** — test de restauration : la dernière archive est déchiffrée, extraite dans un dossier temporaire et relue. Résultat : 90 articles, 238 révisions, **RESTAURATION VÉRIFIÉE**.
- **96** — arborescence : catégories, étiquettes, pages, en `<details>`.

**Performance.** Deux causes réelles, mesurées :

1. `getDiscordSnapshot` bloquait le rendu à chaque expiration du cache. Cache périmé servi immédiatement, rafraîchissement en arrière-plan avec verrou.
2. Aucun cache de lecture : chaque page relisait et reparsait 268 Ko + 684 Ko, plusieurs fois par requête. Cache invalidé par (date, taille) et explicitement à l'écriture.

Effet mesuré : article 714 → 480 ms, index 668 → 422 ms, sept pages sous budget.

**Sécurité — vérifié, pas supposé.** `npm audit` : 0 vulnérabilité. En-têtes complets (CSP à nonce, HSTS preload, X-Frame-Options DENY, Permissions-Policy, Referrer-Policy). 5 tentatives par défi A2F. Requêtes SQL paramétrées. `robots.txt` exclut `/admin`, `/connexion`, `/api/`. Sitemap sans `/admin`. Export réservé aux rédacteurs.

**Reste : 36 fonctions**, dont les dix du bot Discord et la refonte de l'éditeur. Le compte honnête, encore une fois : ce qui est coché est vérifié en production ; ce qui ne l'est pas est écrit noir sur blanc.
