import { slugify } from "./slug";
import type { Article, DiscordMember, DiscordRole } from "./types";

/**
 * Générateur des **fiches citoyens**.
 *
 * Le wiki retrace le récit, mais il ne doit pas être un îlot : chaque membre
 * du serveur Discord a droit à une page. Ce module fabrique, pour chaque
 * membre, une fiche standard « Citoyen de Gratianopolis » contenant :
 *
 *   - le **portrait** lu sur l'API Discord (via `discordUserId`, résolu à
 *     l'affichage par `resolveAvatarUrl`) ;
 *   - le **pseudonyme exact** trouvé sur le serveur ;
 *   - une **biographie vide**, à compléter librement depuis l'espace
 *     d'édition ;
 *   - le **statut de citoyen** et les **rôles** réellement portés.
 *
 * ## Deux garanties
 *
 * 1. **Jamais de page en double.** Le slug est dérivé du pseudonyme, puis
 *    suffixe si nécessaire, et l'on ne crée rien si une page — écrite à la
 *    main ou générée précédemment — occupe déjà cette place.
 * 2. **Jamais d'écrasement.** `refreshCitizenArticle` ne touche qu'aux champs
 *    qui viennent de Discord (pseudonyme, ancienneté, rôles). La biographie et
 *    le reste du texte restent ce que la rédaction y a mis.
 *
 * Ce qui est affiché ici est donc toujours une donnée lue sur l'API Discord,
 * et le contenu rédactionnel reste sous la responsabilité de la rédaction.
 */

/** Étiquette portée par les pages générées, pour les reconnaître ensuite. */
export const CITIZEN_TAG = "profil automatique";

/** Auteur enregistré sur les pages générées : permet de les repérer. */
export const CITIZEN_AUTHOR = "Synchronisation Discord";

/** Mention affichée en bas des fiches citoyens. */
const CITIZEN_FOOTER =
  "Données Discord lues sur l'API du serveur (pseudonyme, ancienneté, rôles, " +
  "portrait). La biographie reste à compléter par la rédaction.";

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Un compte est automatique si l'API Discord le déclare comme tel.
 *
 * On ne se fie plus au pseudonyme : un humain peut s'appeler « Robot » ou
 * « BotOfficiel », et se tromper de personne n'a rien de anodin. Le drapeau
 * `bot` vient de l'API, il fait autorité. La comparaison du nom reste en
 * second recours, pour les instantanés de widget qui ne le renseignent pas.
 */
function estCompteAutomatique(member: DiscordMember): boolean {
  if (member.isBot) return true;
  return /^bot\d*$/i.test(member.username) || /bot$/i.test(member.nickname ?? "");
}

/** Formate une date d'arrivée Discord en texte lisible, sans fuseau ambigu. */
function formatJoinDate(joinedAt: string | null): string {
  if (!joinedAt) return "Non renseignée";
  const date = new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return "Non renseignée";
  return date.toISOString().slice(0, 10);
}

/** Liste des rôles réellement portés, dans l'ordre du serveur. */
function roleLabels(roles: DiscordRole[], roleIds: string[]): string[] {
  const held = new Set(roleIds);
  return roles
    .filter((role) => held.has(role.id))
    .map((role) => role.name)
    .filter((name) => name.toLowerCase() !== "bot");
}

/**
 * Déduit un slug libre pour un membre.
 *
 * Le slug est le pseudonyme « slugifié » ; s'il est déjà pris, on suffixe le
 * nom court de l'identifiant Discord. On ne retombe jamais sur le même slug
 * pour deux membres différents.
 */
export function citizenSlug(
  member: DiscordMember,
  taken: ReadonlySet<string>,
): string {
  const base = slugify(member.username || member.displayName);
  const racine = base || "citoyen";
  if (!taken.has(racine)) return racine;

  const suffixe = member.id.slice(-6).toLowerCase();
  const withSuffix = `${racine}-${suffixe}`;
  if (!taken.has(withSuffix)) return withSuffix;

  // Filet de sécurité : cela ne devrait jamais arriver, mais deux membres
  // peuvent porter des pseudonymes identiques une fois slugifiés.
  let compteur = 2;
  while (taken.has(`${racine}-${suffixe}-${compteur}`)) compteur += 1;
  return `${racine}-${suffixe}-${compteur}`;
}

/** Corps de texte d'une fiche citoyen, volontairement minimal. */
function citizenContent(member: DiscordMember, roles: DiscordRole[]): string {
  const nom = member.displayName;
  const held = roleLabels(roles, member.roleIds);

  return `# ${nom}

> Fiche générée automatiquement à partir du compte Discord de ce membre. Les
> informations de la section « Sur le serveur » proviennent de l'API Discord ;
> la biographie, elle, reste à rédiger.

## Sur le serveur

- **Pseudonyme** : ${nom}
- **Identifiant Discord** : \`${member.id}\`
- **Arrivée sur le serveur** : ${formatJoinDate(member.joinedAt)}
- **Rôles** : ${held.length > 0 ? held.join(", ") : "aucun rôle sur le serveur"}

## Biographie

*Cette section est vide. Elle est laissée à la disposition de la rédaction et
du membre concerné : n'écrivez ici que ce qui estexact, et attribuez les faits
à leur source comme sur les autres pages du wiki.*

## Voir aussi

- [[personnalites]]
- [[histoire-du-delphinat]]`;
}

/** Construit la fiche complète d'un membre du serveur. */
export function buildCitizenArticle(
  member: DiscordMember,
  roles: DiscordRole[],
  slug: string,
): Article {
  const nom = member.displayName;
  const held = roleLabels(roles, member.roleIds);
  const maintenant = isoNow();

  return {
    slug,
    title: nom,
    category: "personnalites",
    summary:
      `${nom} est membre du serveur Discord de Gratianopolis. Cette fiche est ` +
      "une page de profil standard, à compléter.",
    content: citizenContent(member, roles),
    tags: ["citoyen", "profil discord", CITIZEN_TAG],
    author: CITIZEN_AUTHOR,
    createdAt: maintenant,
    updatedAt: maintenant,
    discordUserId: member.id,
    infobox: {
      caption: "Citoyen de Gratianopolis",
      // Le portrait n'est pas figé ici : `resolveAvatarUrl` lit l'avatar
      // vivant sur l'API Discord, puis le cache local. Rien n'est donc
      // inventé, et la photo suit le membre s'il change d'avatar.
      imageAlt: `Photo de profil Discord de ${nom}`,
      imageCaption: "Portrait issu de l'API Discord du serveur officiel",
      fields: [
        { label: "Pseudonyme", value: nom },
        { label: "Statut", value: "Citoyen de Gratianopolis" },
        { label: "Arrivée sur le serveur", value: formatJoinDate(member.joinedAt) },
        {
          label: "Rôles",
          value: held.length > 0 ? held.join(", ") : "Aucun rôle",
        },
        { label: "Identifiant Discord", value: member.id },
      ],
      footer: CITIZEN_FOOTER,
    },
  };
}

/** La page est-elle une fiche citoyen générée automatiquement ? */
export function isCitizenPage(article: Article): boolean {
  return (
    article.category === "personnalites" &&
    (article.author === CITIZEN_AUTHOR || article.tags.includes(CITIZEN_TAG))
  );
}

/**
 * Remet à jour les seuls champs qui viennent de Discord.
 *
 * Le pseudonyme, l'ancienneté, les rôles et l'identifiant sont réécrits — ce
 * sont des faits lus sur l'API, pas du texte rédigé. Le **titre**, le
 * **résumé** et le **corps** ne sont pas modifiés : la rédaction garde la
 * main sur ce qui est écrit sur la page.
 */
export function refreshCitizenArticle(
  article: Article,
  member: DiscordMember,
  roles: DiscordRole[],
): Article {
  const held = roleLabels(roles, member.roleIds);
  return {
    ...article,
    discordUserId: member.id,
    updatedAt: isoNow(),
    infobox: {
      ...article.infobox,
      fields: [
        { label: "Pseudonyme", value: member.displayName },
        { label: "Statut", value: "Citoyen de Gratianopolis" },
        { label: "Arrivée sur le serveur", value: formatJoinDate(member.joinedAt) },
        {
          label: "Rôles",
          value: held.length > 0 ? held.join(", ") : "Aucun rôle",
        },
        { label: "Identifiant Discord", value: member.id },
      ],
    },
  };
}

export interface CitizenSyncPlan {
  /** Fiches à créer pour des membres qui n'ont pas encore de page. */
  toCreate: Array<{ member: DiscordMember; slug: string }>;
  /** Fiches générées dont les données Discord sont à rafraîchir. */
  toRefresh: Array<{ article: Article; member: DiscordMember }>;
  /**
   * Fiches citoyens becoming obsolete because their member is now covered by
   * a hand-written page (a personality of the lore), or because the account
   * turned out to be a bot. They are the duplicate accounts we must purge.
   */
  toDelete: Array<{ article: Article; reason: string }>;
  /** Membres dont la page existe déjà et n'est pas une fiche automate. */
  skipped: Array<{ member: DiscordMember; slug: string; reason: string }>;
  /** Comptes automatiques repérés, qui n'ont reçu aucune fiche. */
  bots: string[];
}

/**
 * Compare l'inventaire des membres du serveur aux pages existantes et établit
 * le plan de synchronisation. Cette fonction ne modifie rien : elle renvoie la
 * liste des actions à faire, que l'appelant décide d'appliquer.
 */
export function planCitizenSync(
  members: readonly DiscordMember[],
  articles: readonly Article[],
  roles: readonly DiscordRole[],
): CitizenSyncPlan {
  const parDiscordId = new Map<string, Article>();
  const slugsPris = new Set<string>();
  for (const article of articles) {
    slugsPris.add(article.slug);
    if (article.discordUserId) {
      parDiscordId.set(article.discordUserId, article);
    }
  }

  const plan: CitizenSyncPlan = { toCreate: [], toRefresh: [], skipped: [], toDelete: [], bots: [] };
  const slugsVus = new Set<string>();

  // Identifiants déjà couverts par une page rédigée à la main : ces membres
  // n'ont pas besoin d'une fiche citoyen, et s'ils en ont une, elle fait
  // doublon avec la page du lore.
  const idsDuLore = new Set(
    articles
      .filter((article) => article.category === "personnalites" && !isCitizenPage(article))
      .map((article) => article.discordUserId)
      .filter((id): id is string => Boolean(id)),
  );

  for (const article of articles) {
    if (!isCitizenPage(article)) continue;
    if (article.discordUserId && idsDuLore.has(article.discordUserId)) {
      plan.toDelete.push({
        article,
        reason:
          "Doublon : ce membre dispose désormais d'une page de personnalité, " +
          "plus complète que cette fiche automatique.",
      });
      slugsPris.delete(article.slug);
    }
  }

  for (const member of members) {
    // Un compte automatique n'est ni une personnalité ni un citoyen.
    if (estCompteAutomatique(member)) {
      plan.bots.push(member.displayName);
      continue;
    }

    const slug = citizenSlug(member, new Set([...slugsPris, ...slugsVus]));
    const existante = parDiscordId.get(member.id);

    if (existante && idsDuLore.has(member.id)) {
      // La fiche automatique de ce membre vient d'être programmée pour
      // suppression : on n'écrit rien, la page du lore prend le relais.
      plan.skipped.push({
        member,
        slug: existante.slug,
        reason: "Une page de personnalité take le relais",
      });
      slugsVus.add(slug);
      continue;
    }

    if (existante) {
      if (isCitizenPage(existante)) {
        plan.toRefresh.push({ article: existante, member });
      } else {
        plan.skipped.push({
          member,
          slug: existante.slug,
          reason: "Une page rédigée existe déjà pour ce membre",
        });
      }
      slugsVus.add(slug);
      continue;
    }

    // Un membre qui porte déjà une page (rédigée ou générée) mais dont
    // l'identifiant n'y est pas encore : on ne l'écrase pas.
    const collision = articles.find(
      (article) =>
        article.slug === slug ||
        article.title.toLowerCase() === member.displayName.toLowerCase(),
    );
    if (collision) {
      plan.skipped.push({
        member,
        slug: collision.slug,
        reason: "Une page portant déjà ce nom existe",
      });
      slugsVus.add(slug);
      continue;
    }

    plan.toCreate.push({ member, slug });
    slugsVus.add(slug);
  }

  return plan;
}
