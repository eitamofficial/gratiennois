/**
 * Génère `public/Manifeste-PSRG.pdf` à partir de `src/content/manifeste-psrg.json`.
 *
 * La page du wiki et ce document lisent le même fichier : il ne peut donc pas
 * exister de PDF qui raconte autre chose que la page.
 *
 *   npm run assets:manifeste
 *
 * Les polices sont les 14 polices standard du format PDF (Times), en
 * WinAnsiEncoding : aucune police n'est embarquée et le fichier reste léger.
 * L'encodage est vérifié caractère par caractère avant toute mise en page —
 * un accent hors WinAnsi produirait une page illisible, on échoue donc
 * plutôt que d'émettre un document douteux.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SOURCE = "src/content/manifeste-psrg.json";
const SORTIE = "public/Manifeste-PSRG.pdf";

// --- Géométrie : A4, en points ---------------------------------------------
const LARGEUR = 595.28;
const HAUTEUR = 841.89;
const MARGE = 56;
const LARGEUR_UTILE = LARGEUR - 2 * MARGE;
/** Place réservée en bas de page pour le folio. */
const PIED = 30;

const COULEURS = {
  texte: rgb(0.11, 0.11, 0.13),
  discret: rgb(0.42, 0.42, 0.46),
  accent: rgb(0.6, 0.11, 0.11),
  filet: rgb(0.82, 0.82, 0.84),
  bandeau: rgb(0.96, 0.95, 0.93),
};

// --- Encodage ---------------------------------------------------------------

/**
 * Caractères réellement disponibles en WinAnsiEncoding.
 *
 * On décode les 256 octets de la table cp1252 : c'est exactement ce que le
 * lecteur PDF saura afficher avec une police standard.
 */
const WINANSI = (() => {
  const decodeur = new TextDecoder("windows-1252");
  const permis = new Set();
  for (let octet = 0; octet < 256; octet += 1) {
    const caractere = decodeur.decode(Uint8Array.of(octet));
    if (caractere && caractere.codePointAt(0) >= 0x20) permis.add(caractere);
  }
  return permis;
})();

/** Espace insécable et espace fine : remplacés par une espace ordinaire. */
const ESPACES_SPECIAUX = /[  ]/g;

/** Signale les caractères que le PDF ne saura pas afficher. */
function verifierEncodage(texte, ou) {
  const fautifs = new Set();
  for (const caractere of texte) {
    if (!/\s/.test(caractere) && !WINANSI.has(caractere)) fautifs.add(caractere);
  }
  if (fautifs.size > 0) {
    const liste = [...fautifs]
      .map((c) => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`)
      .join(", ");
    throw new Error(`${ou} contient des caractères hors WinAnsi : ${liste}`);
  }
}

// --- Source -----------------------------------------------------------------

const brut = readFileSync(SOURCE, "utf8");
verifierEncodage(brut, SOURCE);
const manifeste = JSON.parse(brut);

// --- Document ---------------------------------------------------------------

// Note : pdf-lib 1.17 place les dictionnaires d'objets dans un flux
// compressé, et son option `useObjectStreams` n'a plus d'effet. Le document
// reste parfaitement valide — navigateurs, lecteurs PDF et robots le lisent
// sans difficulté — mais `extract_pdf_text.py`, qui ne sait pas décompresser les
// flux d'objets, n'en tire rien. C'est pourquoi le contrôle du contenu se
// fait ici, sur ce que le script dessine réellement, et non en relisant le
// fichier produit.
const pdf = await PDFDocument.create();
pdf.setTitle(manifeste.meta.titre);
pdf.setSubject(manifeste.meta.sousTitre);
pdf.setAuthor("Parti Socialiste Révolutionnaire Gratiennois");
pdf.setCreator("Wiki du IIIe Delphinat de Gratianopolis");
pdf.setProducer("scripts/generate_manifeste_pdf.mjs");

const times = await pdf.embedFont(StandardFonts.TimesRoman);
const gras = await pdf.embedFont(StandardFonts.TimesRomanBold);
const italique = await pdf.embedFont(StandardFonts.TimesRomanItalic);

let page;
let y;

function nouvellePage() {
  page = pdf.addPage([LARGEUR, HAUTEUR]);
  y = HAUTEUR - MARGE;
}

/** Fait tourner le curseur vers le bas ; ouvre une page si l'espace manque. */
function reserver(hauteur) {
  if (y - hauteur < MARGE + PIED) nouvellePage();
  y -= hauteur;
}

/** Découpe un texte en lignes tenant dans une largeur donnée. */
function decouper(texte, police, taille, largeur) {
  const lignes = [];
  let courante = "";
  for (const mot of texte.split(/\s+/).filter(Boolean)) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (police.widthOfTextAtSize(essai, taille) <= largeur) {
      courante = essai;
      continue;
    }
    if (courante) lignes.push(courante);
    // Un mot plus large que la ligne — une commande, un chemin — est coupé
    // plutôt que de déborder de la page.
    let fragment = mot;
    while (police.widthOfTextAtSize(fragment, taille) > largeur && fragment.length > 1) {
      let coupe = fragment.length;
      while (coupe > 1 && police.widthOfTextAtSize(fragment.slice(0, coupe), taille) > largeur) {
        coupe -= 1;
      }
      lignes.push(fragment.slice(0, coupe));
      fragment = fragment.slice(coupe);
    }
    courante = fragment;
  }
  if (courante) lignes.push(courante);
  return lignes.length > 0 ? lignes : [""];
}

/**
 * Écrit un bloc de texte déjà découpé, et rend la hauteur consommée.
 *
 * Le découpage est fait une fois par l'appelant lorsque la largeur est
 * connue : ici on ne fait que poser les lignes, ce qui permet de changer de
 * page au milieu d'un bloc sans perdre le fil de la mise en page.
 */
function poserLignes(lignes, { x, taille, police, couleur, interligne, decalage = 0 }) {
  for (const ligne of lignes) {
    reserver(interligne);
    dessiner(page, ligne, {
      x: x + decalage,
      y,
      size: taille,
      font: police,
      color: couleur,
    });
  }
}

/** Écrit un paragraphe complet, en renvoyant sa hauteur. */
function texte(contenu, {
  police = times,
  taille = 10.4,
  couleur = COULEURS.texte,
  interligne = 14.4,
  apres = 0,
  retrait = 0,
  largeur = LARGEUR_UTILE,
  alignerDroite = false,
} = {}) {
  const lignes = decouper(normaliser(contenu), police, taille, largeur - retrait);
  if (alignerDroite) {
    for (const ligne of lignes) {
      reserver(interligne);
      dessiner(page, ligne, {
        x: LARGEUR - MARGE - police.widthOfTextAtSize(ligne, taille),
        y,
        size: taille,
        font: police,
        color: couleur,
      });
    }
  } else {
    poserLignes(lignes, { x: MARGE + retrait, taille, police, couleur, interligne });
  }
  y -= apres;
  return lignes.length * interligne;
}

function normaliser(contenu) {
  return contenu.replace(ESPACES_SPECIAUX, " ");
}

/** Tout ce que le document dessine, dans l'ordre : sert au contrôle final. */
const dessine = [];

/**
 * Pose un texte et vérifie qu'il tombe dans la zone imprimable.
 *
 * Toutes les écritures passent par là. Un débordement en bas de page ou sous
 * la marge se voit mal dans un aperçu : mieux vaut que la génération échoue,
 * ce qui est impossible à rater. `horsZone` exempte les folios, qui sont par
 * définition hors de la zone de texte.
 */
function dessiner(page, texte, options) {
  const { x, y: position, size, horsZone = false } = options;
  dessine.push(texte);
  if (horsZone) {
    page.drawText(texte, options);
    return;
  }
  if (position < MARGE + PIED - 2) {
    throw new Error(
      `Texte sous la zone imprimable (y=${position.toFixed(1)}) : ${JSON.stringify(texte.slice(0, 48))}`,
    );
  }
  if (position + size > HAUTEUR - MARGE + 2) {
    throw new Error(
      `Texte au-dessus de la zone imprimable (y=${position.toFixed(1)}) : ${JSON.stringify(texte.slice(0, 48))}`,
    );
  }
  if (x < 0 || x + options.font.widthOfTextAtSize(texte, size) > LARGEUR) {
    throw new Error(`Texte hors page : ${JSON.stringify(texte.slice(0, 48))}`);
  }
  page.drawText(texte, options);
}

/** Titre d'article : filet plein largeur, puis un blanc. */
function titreArticle(numero, intitule) {
  reserver(48);
  texte(`${numero} — ${intitule}`, {
    police: gras,
    taille: 15,
    couleur: COULEURS.accent,
    interligne: 19,
    apres: 6,
  });
  page.drawLine({
    start: { x: MARGE, y: y + 2 },
    end: { x: LARGEUR - MARGE, y: y + 2 },
    thickness: 0.8,
    color: COULEURS.filet,
  });
  reserver(12);
}

function filet(epaisseur = 0.6, couleur = COULEURS.filet) {
  reserver(epaisseur + 10);
  page.drawLine({
    start: { x: MARGE, y },
    end: { x: LARGEUR - MARGE, y },
    thickness: epaisseur,
    color: couleur,
  });
}

// --- Tableau ----------------------------------------------------------------

const TAILLE_CELLULE = 8.6;
const INTERLIGNE_CELLULE = 11;
const REMPLISSAGE_CELLULE = 6;

/**
 * Tableau à en-tête répété : chaque ligne peut déborder sur la page suivante,
 * auquel cas l'en-tête est redessiné.
 *
 * `fractions` décrit la largeur de chaque colonne en fraction de la largeur
 * utile ; la somme doit valoir 1.
 */
function tableau(colonnes, lignes, fractions) {
  const largeurs = fractions.map((f) => f * LARGEUR_UTILE);

  const hauteurDe = (cellules, police, taille) => {
    let maxi = 0;
    cellules.forEach((cellule, index) => {
      const nombre = decouper(
        normaliser(cellule),
        police,
        taille,
        largeurs[index] - 2 * REMPLISSAGE_CELLULE,
      ).length;
      maxi = Math.max(maxi, nombre);
    });
    return maxi * INTERLIGNE_CELLULE + 2 * REMPLISSAGE_CELLULE;
  };

  const dessinerBandeau = (cellules, police, taille, hauteur, couleur, fond) => {
    if (fond) {
      page.drawRectangle({
        x: MARGE,
        y: y + 2,
        width: LARGEUR_UTILE,
        height: hauteur - 4,
        color: COULEURS.bandeau,
      });
    }
    let x = MARGE + REMPLISSAGE_CELLULE;
    cellules.forEach((cellule, index) => {
      const largeur = largeurs[index] - 2 * REMPLISSAGE_CELLULE;
      const lignesCellule = decouper(normaliser(cellule), police, taille, largeur);
      let ligneY = y + hauteur - REMPLISSAGE_CELLULE - taille;
      for (const ligne of lignesCellule) {
        dessiner(page, ligne, { x, y: ligneY, size: taille, font: police, color: couleur });
        ligneY -= INTERLIGNE_CELLULE;
      }
      x += largeurs[index];
    });
  };

  const poserEnTete = () => {
    const hauteur = hauteurDe(colonnes, gras, TAILLE_CELLULE - 0.6);
    if (y - hauteur < MARGE + PIED) nouvellePage();
    y -= hauteur;
    dessinerBandeau(colonnes, gras, TAILLE_CELLULE - 0.6, hauteur, COULEURS.accent, true);
  };

  poserEnTete();
  lignes.forEach((cellules, index) => {
    const hauteur = hauteurDe(cellules, times, TAILLE_CELLULE);
    if (y - hauteur < MARGE + PIED) {
      nouvellePage();
      poserEnTete();
    }
    y -= hauteur;
    dessinerBandeau(cellules, times, TAILLE_CELLULE, hauteur, COULEURS.texte, index % 2 === 1);
  });
  reserver(12);
}

// --- Blocs de mesure --------------------------------------------------------

/**
 * Une mesure est un bloc, pas une ligne : la décision, son mécanisme, qui
 * l'actionne et l'outil qui l'exécute. Un filet d'accent à gauche marque la
 * séparation quand le bloc tient sur une seule page.
 */
function mesure(entree) {
  const pageDepart = page;
  const yDepart = y;
  const largeur = LARGEUR_UTILE - 12;

  reserver(44);
  texte(entree.intitule, { police: gras, taille: 10.8, interligne: 14, largeur });
  texte(`Décision — ${entree.decision}`, { taille: 9.6, interligne: 12.4, largeur, apres: 3 });
  texte(`Mécanisme — ${entree.mecanisme}`, {
    taille: 9.6,
    couleur: COULEURS.discret,
    interligne: 12.4,
    largeur,
    apres: 3,
  });
  texte(`Opérateur : ${entree.operateur}`, {
    police: italique,
    taille: 9.2,
    couleur: COULEURS.discret,
    interligne: 12,
    largeur,
  });
  texte(`Outil : ${entree.outil}`, {
    taille: 9.2,
    couleur: COULEURS.accent,
    interligne: 12,
    largeur,
    apres: 14,
  });

  if (page === pageDepart) {
    page.drawLine({
      start: { x: MARGE, y: yDepart - 3 },
      end: { x: MARGE, y: y + 8 },
      thickness: 1.6,
      color: COULEURS.accent,
    });
  }
}

function puce(contenu) {
  const largeur = LARGEUR_UTILE - 16;
  const lignes = decouper(normaliser(contenu), times, 9.8, largeur);
  reserver(lignes.length * 12.6 + 4);
  let premiere = true;
  for (const ligne of lignes) {
    if (premiere) {
      dessiner(page, "—", { x: MARGE, y, size: 9.8, font: times, color: COULEURS.accent });
      premiere = false;
    }
    dessiner(page, ligne, { x: MARGE + 16, y, size: 9.8, font: times, color: COULEURS.discret });
    y -= 12.6;
  }
}

// --- Couverture -------------------------------------------------------------

nouvellePage();
y = HAUTEUR - MARGE - 80;

texte(manifeste.meta.sigle, {
  police: gras,
  taille: 30,
  couleur: COULEURS.accent,
  alignerDroite: true,
  apres: 30,
});
texte(manifeste.meta.titre, {
  police: gras,
  taille: 26,
  interligne: 31,
  apres: 16,
});
page.drawLine({
  start: { x: MARGE, y },
  end: { x: MARGE + 150, y },
  thickness: 2,
  color: COULEURS.accent,
});
y -= 26;
texte(manifeste.meta.sousTitre, {
  police: italique,
  taille: 12,
  couleur: COULEURS.discret,
  interligne: 17,
  largeur: LARGEUR_UTILE - 60,
  apres: 20,
});
texte(manifeste.meta.edition, { taille: 10, couleur: COULEURS.discret, apres: 20 });
texte(manifeste.meta.resume, { taille: 10, interligne: 14, largeur: LARGEUR_UTILE - 40, apres: 18 });

filet(0.6);

const LARGEUR_LABEL = 150;
for (const entree of manifeste.identite) {
  reserver(13);
  dessiner(page, entree.label, {
    x: MARGE,
    y,
    size: 8.8,
    font: gras,
    color: COULEURS.discret,
  });
  const lignes = decouper(
    normaliser(entree.valeur),
    times,
    8.8,
    LARGEUR_UTILE - LARGEUR_LABEL,
  );
  let ligneY = y;
  for (const ligne of lignes) {
    if (ligneY - 11 < MARGE + PIED) {
      reserver(11);
      ligneY = y;
    }
    dessiner(page, ligne, { x: MARGE + LARGEUR_LABEL, y: ligneY, size: 8.8, font: times });
    ligneY -= 11;
  }
  y -= 3;
}

// --- Sommaire ---------------------------------------------------------------

nouvellePage();
texte("Sommaire", { police: gras, taille: 16, couleur: COULEURS.accent, apres: 12 });
filet(0.6);
reserver(4);

const poserEntreeSommaire = (numero, intitule, accentue) => {
  reserver(15);
  dessiner(page, numero, {
    x: MARGE,
    y,
    size: 9.4,
    font: accentue ? italique : gras,
    color: accentue ? COULEURS.discret : COULEURS.accent,
  });
  const lignes = decouper(
    normaliser(intitule),
    accentue ? italique : times,
    9.4,
    LARGEUR_UTILE - 100,
  );
  dessiner(page, lignes[0], {
    x: MARGE + 100,
    y,
    size: 9.4,
    font: accentue ? italique : times,
    color: accentue ? COULEURS.discret : COULEURS.texte,
  });
};

for (const section of manifeste.sections) poserEntreeSommaire(section.numero, section.titre, false);
for (const annexe of manifeste.annexes) poserEntreeSommaire(annexe.numero, annexe.titre, true);

// --- Avertissement ----------------------------------------------------------

nouvellePage();
texte("Préambule éditorial", { police: gras, taille: 13, couleur: COULEURS.accent, apres: 8 });
texte(manifeste.avertissement, { taille: 10.5, interligne: 15, apres: 6 });

// --- Articles ---------------------------------------------------------------

for (const section of manifeste.sections) {
  nouvellePage();
  titreArticle(section.numero, section.titre);
  texte(section.chapeau, {
    police: italique,
    taille: 11.4,
    interligne: 15.5,
    apres: 12,
  });
  for (const paragraphe of section.paragraphes) {
    texte(paragraphe, { taille: 10.4, interligne: 14.6, apres: 9 });
  }
  for (const entree of section.mesures) mesure(entree);

  if (section.interdits.length > 0) {
    reserver(20);
    texte("Interdits", { police: gras, taille: 9.6, couleur: COULEURS.accent, apres: 5 });
    for (const interdit of section.interdits) puce(interdit);
    reserver(10);
  }
}

// --- Annexes ----------------------------------------------------------------

for (const annexe of manifeste.annexes) {
  nouvellePage();
  titreArticle(annexe.numero, annexe.titre);
  texte(annexe.intro, {
    taille: 10,
    couleur: COULEURS.discret,
    interligne: 14,
    apres: 12,
  });

  if (annexe.groupes) {
    for (const groupe of annexe.groupes) {
      reserver(22);
      texte(groupe.module, { police: gras, taille: 10, apres: 5 });
      tableau(annexe.colonnes, groupe.lignes, [0.2, 0.13, 0.13, 0.54]);
    }
  } else {
    const fractions =
      annexe.colonnes.length === 3 ? [0.18, 0.17, 0.65] : [0.13, 0.35, 0.22, 0.3];
    tableau(annexe.colonnes, annexe.lignes ?? [], fractions);
  }
}

// --- Clôture ----------------------------------------------------------------

nouvellePage();
y = HAUTEUR - MARGE - 170;
texte(manifeste.cloture, {
  police: italique,
  taille: 14,
  interligne: 22,
  largeur: LARGEUR_UTILE - 40,
  apres: 24,
});

// --- Folios -----------------------------------------------------------------

// Posés en dernier : le nombre de pages n'est connu qu'à la fin.
const pages = pdf.getPages();
pages.forEach((laPage, index) => {
  if (index === 0) return;
  const haut = HAUTEUR - MARGE + 26;
  const bas = MARGE - PIED + 8;

  dessiner(laPage, manifeste.meta.titre, {
    x: MARGE,
    y: haut,
    size: 7.5,
    font: times,
    color: COULEURS.discret,
    horsZone: true,
  });
  const etiquette = `${manifeste.meta.edition} · ${index + 1} / ${pages.length}`;
  dessiner(laPage, etiquette, {
    x: LARGEUR - MARGE - times.widthOfTextAtSize(etiquette, 7.5),
    y: haut,
    size: 7.5,
    font: times,
    color: COULEURS.discret,
    horsZone: true,
  });
  laPage.drawLine({
    start: { x: MARGE, y: haut - 6 },
    end: { x: LARGEUR - MARGE, y: haut - 6 },
    thickness: 0.4,
    color: COULEURS.filet,
  });
  laPage.drawLine({
    start: { x: MARGE, y: bas },
    end: { x: LARGEUR - MARGE, y: bas },
    thickness: 0.4,
    color: COULEURS.filet,
  });
});

// --- Contrôle du contenu ---------------------------------------------------

/**
 * Vérifie que le PDF contient bien tout le manifeste.
 *
 * On ne relit pas le PDF produit — pdf-lib range les dictionnaires dans un
 * flux compressé — mais on contrôle ce que le script a réellement dessiné.
 * La comparaison ignore les espaces : le texte est découpé en lignes, et un
 * mot plus long qu'une ligne est coupé sans espace, ce qui rendrait la
 * comparaison par sous-chaîne trop fragile.
 */
function controlerContenu() {
  const compact = (s) => s.replace(/\s+/g, "");
  const tout = compact(dessine.join(" "));
  const attendus = [];
  const ajouter = (valeur) => {
    if (typeof valeur === "string" && valeur.trim()) attendus.push(valeur);
  };

  ajouter(manifeste.meta.titre);
  ajouter(manifeste.meta.sousTitre);
  ajouter(manifeste.meta.edition);
  ajouter(manifeste.meta.resume);
  ajouter(manifeste.avertissement);
  ajouter(manifeste.cloture);
  for (const entree of manifeste.identite) {
    ajouter(entree.label);
    ajouter(entree.valeur);
  }
  for (const section of manifeste.sections) {
    ajouter(section.titre);
    ajouter(section.chapeau);
    for (const paragraphe of section.paragraphes) ajouter(paragraphe);
    for (const entree of section.mesures) {
      ajouter(entree.intitule);
      ajouter(entree.decision);
      ajouter(entree.mecanisme);
      ajouter(entree.operateur);
      ajouter(entree.outil);
    }
    for (const interdit of section.interdits) ajouter(interdit);
  }
  for (const annexe of manifeste.annexes) {
    ajouter(annexe.titre);
    ajouter(annexe.intro);
    for (const colonne of annexe.colonnes) ajouter(colonne);
    for (const groupe of annexe.groupes ?? []) {
      ajouter(groupe.module);
      for (const ligne of groupe.lignes) for (const cellule of ligne) ajouter(cellule);
    }
    for (const ligne of annexe.lignes ?? []) for (const cellule of ligne) ajouter(cellule);
  }

  const manquants = attendus.filter((attendu) => !tout.includes(compact(attendu)));
  if (manquants.length > 0) {
    for (const attendu of manquants.slice(0, 10)) {
      console.error(`  NON DESSINE : ${JSON.stringify(attendu.slice(0, 90))}`);
    }
    throw new Error(`${manquants.length} fragment(s) du manifeste manquent dans le PDF.`);
  }
  return attendus.length;
}

const verifies = controlerContenu();

// --- Écriture ---------------------------------------------------------------

const octets = await pdf.save();
writeFileSync(SORTIE, octets);
console.log(
  `Manifeste-PSRG.pdf écrit : ${pages.length} pages, ${(octets.length / 1024).toFixed(1)} Ko, ` +
    `${verifies} fragments du manifeste vérifiés.`,
);
