/**
 * Last.fm.
 *
 * L'API de Last.fm exige une clé : sans `LASTFM_API_KEY`, le bot ne peut rien
 * demander. Il le dit alors **explicitement** plutôt que de renvoyer une liste
 * vide, qui laisserait croire que l'utilisateur n'écoute rien.
 *
 * Rien n'est journalisé de ce que les gens écoutent : ces données sont
 * publiques par nature sur Last.fm, mais le bot n'a aucune raison de les
 * conserver.
 */

/** Erreur compréhensible par l'utilisateur. */
export class ErreurLastfm extends Error {}

const RACINE = "https://ws.audioscrobbler.com/2.0/";

/** La clé est-elle configurée ? */
export function lastfmConfigure() {
  return Boolean(process.env.LASTFM_API_KEY?.trim());
}

/** Appelle l'API Last.fm et rend la réponse JSON. */
async function appeler(methode, parametres) {
  const cle = process.env.LASTFM_API_KEY?.trim();
  if (!cle) {
    throw new ErreurLastfm(
      "Last.fm demande une clé d'API : renseignez `LASTFM_API_KEY` dans DelphinaBotV2/.env (voir https://www.last.fm/api/account/create).",
    );
  }

  const requete = new URLSearchParams({
    method: methode,
    api_key: cle,
    format: "json",
    ...parametres,
  });

  let reponse;
  try {
    reponse = await fetch(`${RACINE}?${requete.toString()}`, { signal: AbortSignal.timeout(12_000) });
  } catch (erreur) {
    throw new ErreurLastfm(`Last.fm est injoignable : ${erreur.message}`);
  }

  if (reponse.status === 403) throw new ErreurLastfm("Clé Last.fm refusée par le service.");
  if (!reponse.ok) throw new ErreurLastfm(`Last.fm a répondu HTTP ${reponse.status}.`);

  const donnees = await reponse.json().catch(() => null);
  if (donnees?.error) throw new ErreurLastfm(`Last.fm : ${donnees.message ?? `erreur ${donnees.error}`}`);
  return donnees;
}

/** Les derniers morceaux écoutés par un utilisateur. */
export async function ecoutes(depuis, nombre = 5) {
  const donnees = await appeler("user.getrecenttracks", { user: depuis, limit: String(nombre) });
  const morceaux = donnees?.recenttracks?.track ?? [];
  const liste = Array.isArray(morceaux) ? morceaux : [morceaux];

  return liste.map((morceau) => ({
    titre: morceau.name,
    artiste: morceau.artist?.["#text"] ?? morceau.artist?.name ?? "inconnu",
    album: morceau.album?.["#text"] ?? null,
    enCours: morceau["@attr"]?.nowplaying === "true",
    url: morceau.url ?? null,
  }));
}

/** Les artistes les plus écoutés par un utilisateur. */
export async function artistes(depuis, nombre = 5) {
  const donnees = await appeler("user.gettopartists", { user: depuis, limit: String(nombre) });
  const brut = donnees?.topartists?.artist ?? [];
  const liste = Array.isArray(brut) ? brut : [brut];

  return liste.map((element) => ({
    nom: element.name,
    ecoutes: Number(element.playcount ?? 0),
    url: element.url ?? null,
  }));
}

/** Les informations publiques d'un compte. */
export async function profil(depuis) {
  const donnees = await appeler("user.getinfo", { user: depuis });
  const utilisateur = donnees?.user;
  if (!utilisateur) throw new ErreurLastfm("Ce compte Last.fm n'existe pas.");

  return {
    nom: utilisateur.name,
    url: utilisateur.url ?? null,
    pays: utilisateur.country ?? null,
    ecoutes: Number(utilisateur.playcount ?? 0),
    inscrit: Number(utilisateur.registered?.unixtime ?? 0) * 1000 || null,
  };
}
