/**
 * Paroles de morceaux, depuis Genius.
 *
 * Sans jeton, la recherche publique du site est utilisée puis les paroles sont
 * extraites de la page ; avec `GENIUS_TOKEN`, l'API officielle est préférée,
 * car elle ne dépend pas de la mise en page du site.
 */

import { normaliser } from "../lib/texte.js";

const AGENT = "Mozilla/5.0 (compatible; DelphinaBot/2.0)";
const ENTETES = { "user-agent": AGENT, accept: "text/html,application/json" };

/** Sépare « Artiste - Titre » quand la forme est explicite. */
export function decouper(query) {
  const brut = String(query ?? "").trim();
  const morceaux = brut.split(/\s[–—-]\s/);
  if (morceaux.length >= 2) {
    return { artiste: morceaux[0].trim(), titre: morceaux.slice(1).join(" - ").trim() };
  }
  return { artiste: null, titre: brut };
}

async function chercherAvecJeton(jeton, query) {
  const reponse = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
    headers: { ...ENTETES, authorization: `Bearer ${jeton}` },
  }).catch(() => null);
  if (!reponse?.ok) return [];

  const donnees = await reponse.json().catch(() => ({}));
  return (donnees.response?.hits ?? [])
    .map((hit) => hit.result)
    .filter((resultat) => Boolean(resultat?.url));
}

async function chercherPubliquement(query) {
  const reponse = await fetch(
    `https://genius.com/api/search/multi?per_page=5&q=${encodeURIComponent(query)}`,
    { headers: ENTETES },
  ).catch(() => null);
  if (!reponse?.ok) return [];

  const donnees = await reponse.json().catch(() => ({}));
  const resultats = [];
  for (const section of donnees.response?.sections ?? []) {
    for (const hit of section.hits ?? []) {
      // Les sections « top_hit », « album », « artiste » mêlent des pages sans
      // paroles : seul le type « song » nous intéresse.
      if (hit.type === "song" && hit.result?.url) resultats.push(hit.result);
    }
  }
  return resultats;
}

/**
 * Extrait le texte des conteneurs `data-lyrics-container="true"`, en suivant
 * l'imbrication des balises `<div>` : les paroles sont souvent découpées en
 * plusieurs blocs successifs.
 */
function extraireConteneurs(html) {
  const blocs = [];
  const marqueur = 'data-lyrics-container="true"';
  let index = html.indexOf(marqueur);

  while (index !== -1) {
    const fin = html.indexOf(">", index);
    if (fin === -1) break;

    let profondeur = 1;
    let curseur = fin + 1;
    const balises = /<\/?div\b[^>]*>/gi;
    balises.lastIndex = curseur;
    let correspondance = null;

    while (profondeur > 0 && (correspondance = balises.exec(html)) !== null) {
      if (correspondance[0].startsWith("</")) profondeur -= 1;
      else profondeur += 1;
      curseur = balises.lastIndex;
    }

    blocs.push(
      html.slice(fin + 1, profondeur === 0 && correspondance ? correspondance.index : html.length),
    );
    index = html.indexOf(marqueur, curseur || fin + 1);
  }

  return blocs;
}

function decoderEntites(texte) {
  const nommees = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return texte
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => nommees[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function nettoyer(fragment) {
  return decoderEntites(
    fragment
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Retire l'en-tête de page Genius (contributeurs, traductions, « Read More »). */
function retirerEnTete(texte) {
  let sortie = texte
    .split("\n")
    .filter((ligne) => !/^\d*\s*Contributors/i.test(ligne.trim()))
    .join("\n")
    .replace(/Translations[\s\S]*?Read More\s*\n?/i, "")
    .replace(/Read More\s*\n?/gi, "");

  const lignes = sortie.split("\n");
  const premiereSection = lignes.findIndex((ligne) => /^\s*\[[^\]]{1,40}\]\s*$/.test(ligne));
  if (premiereSection > 0) sortie = lignes.slice(premiereSection).join("\n");

  return sortie.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Choisit le résultat qui correspond réellement au morceau demandé.
 *
 * La recherche de Genius est large : demander « Comme toi » peut renvoyer une
 * chanson sans rapport. Quand un artiste est fourni, on cherche donc les deux
 * ensemble, et l'on privilégie un titre qui contient bien celui demandé. Sans
 * correspondance, on garde le premier résultat — mieux vaut des paroles
 * approchantes qu'aucune réponse.
 */
export function choisirResultat(resultats, titre, artiste) {
  if (resultats.length === 0) return null;
  const attendu = normaliser(titre);
  const correspondance = resultats.find((resultat) => {
    const titreTrouve = normaliser(resultat.title ?? "");
    const artisteTrouve = normaliser(resultat.primary_artist?.name ?? "");
    const titreOk = attendu && titreTrouve.includes(attendu);
    if (!titreOk) return false;
    return !artiste || !artisteTrouve || artisteTrouve.includes(normaliser(artiste));
  });
  return correspondance ?? resultats[0];
}

/** Cherche les paroles d'un morceau. Renvoie `null` si Genius n'a rien. */
export async function trouverParoles(query) {
  const { artiste, titre } = decouper(query);
  if (!titre) return null;

  const jeton = process.env.GENIUS_TOKEN?.trim();
  // L'artiste fait partie de la requête : c'est ce qui évite de tomber sur
  // une autre chanson qui porte le même titre.
  const requete = artiste ? `${titre} ${artiste}` : titre;
  const resultats = jeton ? await chercherAvecJeton(jeton, requete) : await chercherPubliquement(requete);
  const premier = choisirResultat(resultats, titre, artiste);
  if (!premier?.url) return null;

  const page = await fetch(premier.url, { headers: ENTETES }).catch(() => null);
  if (!page?.ok) return null;

  const texte = retirerEnTete(
    extraireConteneurs(await page.text())
      .map(nettoyer)
      .filter(Boolean)
      .join("\n\n"),
  );

  if (!texte) return null;

  return {
    titre: premier.title ?? titre,
    artiste: premier.primary_artist?.name ?? null,
    url: premier.url,
    texte,
  };
}
