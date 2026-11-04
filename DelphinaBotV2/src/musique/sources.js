/**
 * Résolution des liens de plateformes de streaming.
 *
 * Spotify et Deezer diffusent sous DRM : aucun outil ne peut en extraire
 * l'audio, et `yt-dlp` refuse explicitement ces deux domaines. La seule voie
 * honnête est donc de lire **les métadonnées** (titre, artiste), puis de
 * chercher le morceau correspondant là où il est réellement diffusable.
 *
 * Deezer expose une API publique sans clé : on l'utilise. Spotify demande des
 * identifiants pour les albums et les playlists ; pour un morceau isolé, les
 * balises OpenGraph de la page suffisent, et le bot fonctionne donc sans
 * configuration supplémentaire dans le cas le plus courant.
 */

const LIEN_SPOTIFY = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/i;
const LIEN_DEEZER = /deezer\.(?:com|page\.link)\/(?:[a-z]{2}\/)?(track|album|playlist)\/(\d+)/i;

const AGENT = "Mozilla/5.0 (compatible; DelphinaBot/2.0)";

/** Erreur compréhensible par l'utilisateur. */
export class ErreurSource extends Error {}

/** Le lien est-il un lien Spotify ou Deezer que l'on sait traduire ? */
export function estLienResolvable(cible) {
  return LIEN_SPOTIFY.test(cible) || LIEN_DEEZER.test(cible);
}

/**
 * Traduit un lien Spotify ou Deezer en une ou plusieurs requêtes de recherche
 * (« Titre Artiste »), dans l'ordre du morceau, de l'album ou de la playlist.
 */
export async function resoudreLien(cible) {
  const spotify = cible.match(LIEN_SPOTIFY);
  if (spotify) {
    const [, type, id] = spotify;
    if (type.toLowerCase() === "track") return [await morceauSpotify(id)];
    return elementsSpotify(type.toLowerCase(), id);
  }

  const deezer = cible.match(LIEN_DEEZER);
  if (deezer) {
    const [, type, id] = deezer;
    return elementsDeezer(type.toLowerCase(), id);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Spotify
// ---------------------------------------------------------------------------

let jetonSpotify = null;

async function jetonIdentifiants() {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  if (jetonSpotify && Date.now() < jetonSpotify.expireLe) return jetonSpotify.valeur;

  const reponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  }).catch(() => null);

  if (!reponse?.ok) return null;
  const donnees = await reponse.json().catch(() => ({}));
  if (!donnees.access_token) return null;

  jetonSpotify = {
    valeur: donnees.access_token,
    expireLe: Date.now() + ((donnees.expires_in ?? 3600) - 60) * 1000,
  };
  return jetonSpotify.valeur;
}

async function apiSpotify(chemin) {
  const jeton = await jetonIdentifiants();
  if (!jeton) return null;
  const reponse = await fetch(`https://api.spotify.com/v1${chemin}`, {
    headers: { authorization: `Bearer ${jeton}` },
  }).catch(() => null);
  if (!reponse?.ok) return null;
  return reponse.json().catch(() => null);
}

/** Morceau isolé : sans identifiants, on lit les balises de la page publique. */
async function morceauSpotify(id) {
  const reponse = await fetch(`https://open.spotify.com/track/${id}`, {
    headers: { "user-agent": AGENT },
  }).catch(() => null);

  if (!reponse?.ok) throw new ErreurSource("Impossible de lire cette page Spotify.");

  const html = await reponse.text();
  const balise = (propriete) => {
    const motif = new RegExp(
      `<meta[^>]+(?:property|name)="${propriete}"[^>]+content="([^"]*)"`,
      "i",
    );
    return html.match(motif)?.[1] ?? null;
  };

  const titre = balise("og:title");
  // `og:description` vaut « Artiste · Morceau · 1987 » : le premier segment
  // est l'artiste.
  const artiste = (balise("og:description") ?? "").split("·")[0]?.trim() ?? "";

  if (!titre) throw new ErreurSource("Ce morceau Spotify n'a pas de titre lisible.");
  return `${titre} ${artiste}`.trim();
}

async function elementsSpotify(type, id) {
  const chemin = type === "album" ? `/albums/${id}?limit=50` : `/playlists/${id}?limit=50`;
  const donnees = await apiSpotify(chemin);
  if (!donnees) {
    throw new ErreurSource(
      "Les albums et playlists Spotify demandent SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET.",
    );
  }

  const brut = type === "album" ? donnees.tracks?.items : donnees.tracks?.items;
  const items = Array.isArray(brut) ? brut : [];

  const requetes = [];
  for (const element of items) {
    const morceau = type === "album" ? element : (element?.track ?? {});
    const nom = morceau?.name;
    if (!nom) continue;
    const artistes = (morceau?.artists ?? []).map((a) => a.name).join(" ");
    requetes.push(`${nom} ${artistes}`.trim());
  }

  if (requetes.length === 0) throw new ErreurSource("Cette playlist Spotify est vide.");
  return requetes;
}

// ---------------------------------------------------------------------------
// Deezer (API publique, sans clé)
// ---------------------------------------------------------------------------

async function apiDeezer(chemin) {
  const reponse = await fetch(`https://api.deezer.com${chemin}`).catch(() => null);
  if (!reponse?.ok) return null;
  return reponse.json().catch(() => null);
}

async function elementsDeezer(type, id) {
  if (type === "track") {
    const morceau = await apiDeezer(`/track/${id}`);
    if (!morceau?.title) throw new ErreurSource("Ce morceau Deezer est introuvable.");
    return [`${morceau.title} ${morceau.artist?.name ?? ""}`.trim()];
  }

  const conteneur = await apiDeezer(type === "album" ? `/album/${id}` : `/playlist/${id}`);
  const items = conteneur?.tracks?.data ?? [];
  const requetes = items
    .map((morceau) => `${morceau.title ?? ""} ${morceau.artist?.name ?? ""}`.trim())
    .filter(Boolean);

  if (requetes.length === 0) throw new ErreurSource("Cette liste Deezer est vide.");
  return requetes;
}
