/**
 * Lien avec le wiki.
 *
 * DelphinaBot n'écrit **jamais** d'article : il signale au wiki des
 * changements de rôles et de noms, et c'est le wiki qui décide quoi en faire.
 * Le secret partagé ne sert qu'à authentifier ces signaux — il n'accorde aucun
 * droit d'écriture sur le contenu.
 *
 * La signature est un HMAC-SHA256 de `horodatage.corps`. Le wiki rejoue le
 * même calcul et rejette ce qui ne correspond pas : un tiers qui intercepte un
 * appel ne peut ni le rejouer (l'horodatage change) ni le modifier (la
 * signature change).
 *
 * Ce que le bot fait avec le wiki, en trois usages :
 *
 *  - `/wiki <recherche>` lit la **recherche publique** du site ;
 *  - la synchronisation automatique pousse `{slug, discordUserId}` quand un
 *    membre reçoit ou perd un rôle connu ;
 *  - `/wiki-etat` interroge la **santé** publique du site pour savoir si la
 *    liaison est vivante.
 */

import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { journal } from "./logger.js";
import { normaliser } from "./lib/texte.js";

/** Nombre d'identifiants qu'un appel de rattachement peut porter. */
export const MAX_LIENS = 20;

// ---------------------------------------------------------------------------
// Configuration partagée (rôles ↔ pages)
// ---------------------------------------------------------------------------

let rosterCache = null;
let rosterChemin = null;

/** Lit `shared/roster.json`, une seule fois par processus. */
export function lireRoster(chemin) {
  if (rosterCache && rosterChemin === chemin) return rosterCache;
  rosterChemin = chemin;

  if (!existsSync(chemin)) {
    journal.warn(`Configuration partagée introuvable : ${chemin}`);
    rosterCache = { version: 0, invite: "", personnages: [], roleMapping: [], historique: [] };
    return rosterCache;
  }

  try {
    const brut = JSON.parse(readFileSync(chemin, "utf8"));
    rosterCache = {
      version: Number(brut.version ?? 1),
      invite: String(brut.guild?.invite ?? ""),
      personnages: Array.isArray(brut.personnages) ? brut.personnages : [],
      roleMapping: Array.isArray(brut.roleMapping) ? brut.roleMapping : [],
      historique: Array.isArray(brut.historique) ? brut.historique : [],
    };
  } catch (erreur) {
    journal.error(`Configuration partagée illisible : ${erreur.message}`);
    rosterCache = { version: 0, invite: "", personnages: [], roleMapping: [], historique: [] };
  }
  return rosterCache;
}

/** Adresse d'une page du wiki. */
export function lienPage(configuration, slug) {
  const racine = configuration.siteUrl || configuration.wikiUrl;
  if (!racine) return null;
  return `${racine}/wiki/${encodeURIComponent(slug)}`;
}

/** Adresse d'une recherche sur le wiki. */
export function lienRecherche(configuration, requete) {
  const racine = configuration.siteUrl || configuration.wikiUrl;
  if (!racine) return null;
  return `${racine}/recherche?q=${encodeURIComponent(requete)}`;
}

// ---------------------------------------------------------------------------
// Rattachement d'un membre
// ---------------------------------------------------------------------------

/** Un nom de rôle ou d'affichage ressemble-t-il à une valeur du roster ? */
function correspond(a, b) {
  const gauche = normaliser(a);
  const droite = normaliser(b);
  return Boolean(gauche) && gauche === droite;
}

/**
 * Pages wiki auxquelles un membre correspond.
 *
 * Deux règles, dans cet ordre :
 *
 *  1. un rôle Discord porté par le membre désigne un personnage du roster ;
 *  2. à défaut, son pseudonyme (ou l'un de ses alias) désigne un personnage.
 *
 * Le nom d'utilisateur et le surnom du serveur sont tous deux essayés : sur
 * Discord, les gens sont souvent connus par l'un ou l'autre.
 */
export function pagesPourMembre(roster, { nomsRole = [], pseudonymes = [] }) {
  const trouves = [];

  for (const personnage of roster.personnages) {
    const parRole = (personnage.roles ?? []).some((role) =>
      nomsRole.some((nom) => correspond(nom, role)),
    );
    const parNom =
      pseudonymes.some((nom) => correspond(nom, personnage.nom)) ||
      (personnage.aliases ?? []).some((alias) =>
        pseudonymes.some((nom) => correspond(nom, alias)),
      );

    if ((parRole || parNom) && personnage.slug) trouves.push(personnage.slug);
  }

  return [...new Set(trouves)];
}

/** Article de fond associé à un rôle Discord (par exemple « Dauphin »). */
export function articlesPourRoles(roster, nomsRole) {
  const trouves = [];
  for (const entree of roster.roleMapping) {
    if (nomsRole.some((nom) => correspond(nom, entree.roleDiscord)) && entree.articleSlug) {
      trouves.push(entree.articleSlug);
    }
  }
  return [...new Set(trouves)];
}

/** Signe un corps avec le secret partagé : HMAC-SHA256 de `horodatage.corps`. */
export function signer(secret, corps, horodatage = String(Date.now())) {
  return createHmac("sha256", secret).update(`${horodatage}.${corps}`).digest("hex");
}

/**
 * Envoie des rattachements au wiki.
 *
 * Sans secret configuré, la fonction ne tente rien et le dit : le bot reste
 * alors pleinement utilisable, seul le lien vers le wiki se tait. C'est un mode
 * d'emploi légitime, pas une panne.
 */
export async function pousserLiens(configuration, liens, origine) {
  if (!configuration.wikiUrl) {
    return { envoye: false, raison: "WIKI_URL absent : rien n'a été transmis.", status: null };
  }
  if (!configuration.secretSync) {
    return { envoye: false, raison: "BOT_SYNC_SECRET absent : rien n'a été transmis.", status: null };
  }
  if (!Array.isArray(liens) || liens.length === 0) {
    return { envoye: false, raison: "Aucun changement à signaler.", status: null };
  }

  const corps = JSON.stringify({
    liens: liens.slice(0, MAX_LIENS),
    source: "delphinabot-v2",
    origine,
  });
  const horodatage = String(Date.now());

  try {
    const reponse = await fetch(`${configuration.wikiUrl}/api/sync/bot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wiki-timestamp": horodatage,
        "x-wiki-signature": signer(configuration.secretSync, corps, horodatage),
      },
      body: corps,
      signal: AbortSignal.timeout(15_000),
    });

    if (!reponse.ok) {
      return {
        envoye: false,
        raison: `Le wiki a refusé (HTTP ${reponse.status}).`,
        status: reponse.status,
      };
    }

    const donnees = await reponse.json().catch(() => ({}));
    return {
      envoye: true,
      raison: null,
      status: reponse.status,
      rattaches: donnees?.linked ?? [],
      ignores: donnees?.ignored ?? [],
      avatar: donnees?.avatar ?? null,
    };
  } catch (erreur) {
    return { envoye: false, raison: `Wiki injoignable : ${erreur.message}`, status: null };
  }
}

// ---------------------------------------------------------------------------
// Lectures publiques
// ---------------------------------------------------------------------------

/** Résultat d'une lecture publique, avec l'erreur traduite en français. */
async function lire(chemin, configuration, delai = 12_000) {
  if (!configuration.wikiUrl) {
    return { ok: false, raison: "WIKI_URL n'est pas configuré dans .env." };
  }
  try {
    const reponse = await fetch(`${configuration.wikiUrl}${chemin}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(delai),
    });
    if (!reponse.ok) {
      return { ok: false, raison: `Le wiki a répondu HTTP ${reponse.status}.` };
    }
    return { ok: true, donnees: await reponse.json() };
  } catch (erreur) {
    return { ok: false, raison: `Wiki injoignable : ${erreur.message}` };
  }
}

/** Recherche publique : `GET /api/search?q=…`. */
export function chercher(configuration, requete, categorie) {
  const parametres = new URLSearchParams({ q: requete });
  if (categorie) parametres.set("categorie", categorie);
  return lire(`/api/search?${parametres.toString()}`, configuration);
}

/** Article complet : `GET /api/articles/<slug>`. */
export function article(configuration, slug) {
  return lire(`/api/articles/${encodeURIComponent(slug)}`, configuration);
}

/** Santé du wiki : `GET /api/health` (publique, sans secret). */
export function sante(configuration) {
  return lire("/api/health", configuration, 8_000);
}
