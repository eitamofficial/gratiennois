import {
  findMemberByName,
  findMembersByName,
  isDiscordConfigured,
  refreshDiscordSnapshot,
} from "@/lib/discord";
import {
  getAllArticles,
  setDiscordUserIds,
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/lib/articles-store";
import { buildCitizenArticle, planCitizenSync, refreshCitizenArticle } from "@/lib/citizen-pages";
import { getRoster } from "@/lib/roster";
import type { DiscordSnapshot } from "@/lib/types";

/**
 * Synchronisation Discord — logique métier, partagée par deux points d'entrée :
 *
 *   - `POST /api/sync/discord`, déclenchée manuellement par le Dauphin depuis
 *     `/admin` (session + rôle vérifiés) ;
 *   - `GET /api/cron/discord`, appelée par Vercel selon l'horaire de
 *     `vercel.json` (secret `CRON_SECRET` vérifié).
 *
 * Extraire cette logique évite que les deux entrées divergent : une
 * correction appliquée à l'une sans l'autre laisserait le wiki se mettre à
 * jour à la main mais jamais tout seul, ou l'inverse.
 */

/** Erreur de configuration de la synchronisation (message destiné à l'affichage). */
export class SyncNotConfiguredError extends Error {}

export interface SyncReport {
  source: string;
  fetchedAt: string;
  guild: DiscordSnapshot["guild"];
  membersFetched: number;
  rolesFetched: number;
  errors: string[];
  resolved: Array<{ slug: string; name: string; discordUserId: string }>;
  unresolved: Array<{ slug: string; name: string; reason: string }>;
  citizens: {
    created: string[];
    refreshed: string[];
    deleted: Array<{ slug: string; reason: string }>;
    bots: unknown[];
    skipped: Array<{ pseudo: string; slug: string; reason: string }>;
    errors: string[];
  };
}

/** Interroge Discord, résout les identifiants et met à jour les fiches citoyens. */
export async function runDiscordSync(): Promise<SyncReport> {
  if (!isDiscordConfigured()) {
    throw new SyncNotConfiguredError(
      "Synchronisation non configurée : définissez DISCORD_BOT_TOKEN et DISCORD_GUILD_ID dans l'environnement.",
    );
  }

  let snapshot: DiscordSnapshot;
  try {
    snapshot = await refreshDiscordSnapshot();
  } catch (error) {
    throw new Error(`Échec de la synchronisation Discord : ${(error as Error).message}`);
  }

// Résolution des personnalités sans ID Discord.
const articles = await getAllArticles();
const resolved: Array<{ slug: string; name: string; discordUserId: string }> = [];
const unresolved: Array<{ slug: string; name: string; reason: string }> = [];

// La configuration partagée fait foi. Un identifiant renseigné à la main
// dans `shared/roster.json` est une décision de la rédaction : elle prime
// sur toute correspondance de nom, et évite qu'une homonymie, ou une
// ressemblance approximative, rattache le mauvais portrait.
const roster = getRoster();

for (const article of articles.filter((item) => item.category === "personnalites")) {
  const officiel = roster.personnages.find(
    (personnage) => personnage.slug === article.slug && personnage.discordUserId,
  );
  if (officiel) {
    const membre = snapshot.members.find((item) => item.id === officiel.discordUserId);
    if (membre) {
      resolved.push({
        slug: article.slug,
        name: article.title,
        discordUserId: membre.id,
      });
    } else {
      unresolved.push({
        slug: article.slug,
        name: article.title,
        reason:
          "Identifiant fixé dans la configuration partagée, mais absent du " +
          "serveur (le membre est-il parti ?)",
      });
    }
    continue;
  }

  if (article.discordUserId) {
    const member = snapshot.members.find((item) => item.id === article.discordUserId);
    if (member) {
      resolved.push({ slug: article.slug, name: article.title, discordUserId: member.id });
    } else {
      unresolved.push({
        slug: article.slug,
        name: article.title,
        reason: "ID Discord enregistré mais introuvable sur le serveur (membre parti ?)",
      });
    }
    continue;
  }

  const member = findMemberByName(snapshot, article.title);
  if (member) {
    resolved.push({ slug: article.slug, name: article.title, discordUserId: member.id });
  } else {
    // Aucun membre renvoyé ne signifie pas forcément « personne » : cela peut
    // vouloir dire « plusieurs ». On le dit, plutôt que de trancher au hasard
    // et de publier le portrait de la mauvaise personne.
    const candidats = findMembersByName(snapshot, article.title);
    const tous = [...candidats.exact, ...candidats.fuzzy];
    unresolved.push({
      slug: article.slug,
      name: article.title,
      reason:
        tous.length > 1
          ? `Ambigu : ${tous.length} membres du serveur portent un nom proche (${tous
              .map((item) => item.displayName)
              .join(", ")})`
          : "Aucun membre du serveur ne correspond à ce nom",
    });
  }
}

await setDiscordUserIds(
  Object.fromEntries(resolved.map((item) => [item.slug, item.discordUserId])),
);

// ---------------------------------------------------------------------
// Fiches citoyens : aucun membre du serveur ne doit rester sans page.
// ---------------------------------------------------------------------
// Le plan est construit à partir de l'inventaire relu **après** la
// résolution des personnalités ci-dessus, afin qu'une fiche déjà rédigée
// pour un membre ne soit ni dupliquée ni écrasée.
const inventaire = await getAllArticles();
const plan = planCitizenSync(snapshot.members, inventaire, snapshot.roles);

const citoyensCreated: string[] = [];
const citoyensRefreshed: string[] = [];
const erreursCitoyens: string[] = [];

// Purge des doublons : une fiche citoyen rendue inutile parce que le membre
// dispose d'une page de personnalité complète. On ne supprime que des pages
// **automatiques** — jamais un article rédigé à la main.
const citoyensDeleted: Array<{ slug: string; reason: string }> = [];
for (const item of plan.toDelete) {
  try {
    await deleteArticle(item.article.slug, "Synchronisation Discord");
    citoyensDeleted.push({ slug: item.article.slug, reason: item.reason });
  } catch (error) {
    erreursCitoyens.push(
      `Suppression de ${item.article.slug} : ${(error as Error).message}`,
    );
  }
}

for (const item of plan.toCreate) {
  try {
    const article = buildCitizenArticle(item.member, snapshot.roles, item.slug);
    await createArticle({
      slug: article.slug,
      title: article.title,
      category: article.category,
      summary: article.summary,
      content: article.content,
      tags: article.tags,
      author: article.author,
      discordUserId: article.discordUserId,
      infobox: article.infobox,
    });
    citoyensCreated.push(article.slug);
  } catch (error) {
    erreursCitoyens.push(
      `${item.member.displayName} : ${(error as Error).message}`,
    );
  }
}

for (const item of plan.toRefresh) {
  try {
    const article = refreshCitizenArticle(
      item.article,
      item.member,
      snapshot.roles,
    );
    await updateArticle(item.article.slug, {
      title: article.title,
      category: article.category,
      summary: article.summary,
      content: article.content,
      tags: article.tags,
      author: article.author,
      discordUserId: article.discordUserId,
      infobox: article.infobox,
    });
    citoyensRefreshed.push(item.article.slug);
  } catch (error) {
    erreursCitoyens.push(
      `${item.member.displayName} : ${(error as Error).message}`,
    );
  }
}

  return {
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    guild: snapshot.guild,
    membersFetched: snapshot.members.length,
    rolesFetched: snapshot.roles.length,
    errors: snapshot.errors,
    resolved,
    unresolved,
    citizens: {
      created: citoyensCreated,
      refreshed: citoyensRefreshed,
      deleted: citoyensDeleted,
      bots: plan.bots,
      skipped: plan.skipped.map((item) => ({
        pseudo: item.member.displayName,
        slug: item.slug,
        reason: item.reason,
      })),
      errors: erreursCitoyens,
    },
  };
}
