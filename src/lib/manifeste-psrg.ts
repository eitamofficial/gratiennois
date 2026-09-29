/**
 * Manifeste du Parti Socialiste Révolutionnaire Gratiennois.
 *
 * Le texte vit dans `src/content/manifeste-psrg.json` et nulle part ailleurs :
 * la page du wiki et le générateur de PDF lisent le même fichier, donc le
 * document téléchargé et la page web ne peuvent pas diverger.
 *
 * Une contrainte éditoriale gouverne ce fichier : rien n'y est énoncé qui ne
 * soit exécutable sur le serveur Discord du Delphinat. Chaque mesure porte un
 * opérateur et un outil, et `npm run check:manifeste` vérifie que toute
 * commande citée existe réellement dans `delphinabot/`.
 */

import contenu from "@/content/manifeste-psrg.json";

/** Une ligne de la fiche d'identité du parti. */
export interface Identite {
  label: string;
  valeur: string;
}

/**
 * Une décision du parti, rédigée pour être appliquée et non pour être lue.
 *
 * Les quatre derniers champs sont ce qui distingue une mesure d'un vœu :
 * l'outil est la commande ou le réglage qui l'exécute, l'opérateur est la
 * main qui l'actionne.
 */
export interface Mesure {
  /** Intitulé de la mesure. */
  intitule: string;
  /** Ce que le parti décide. */
  decision: string;
  /** Comment la décision est mise en œuvre, pas pourquoi elle est belle. */
  mecanisme: string;
  /** Qui l'applique : le bot, l'équipe de modération, un membre, une charge. */
  operateur: string;
  /** La commande, le réglage ou la permission qui l'exécute. */
  outil: string;
}

/** Un article du manifeste. */
export interface Section {
  numero: string;
  titre: string;
  chapeau: string;
  paragraphes: string[];
  mesures: Mesure[];
  /** Ce que le manifeste interdit, dans les mêmes termes qu'il décide. */
  interdits: string[];
}

/** Un groupe de lignes d'annexe, titré par son module. */
export interface GroupeAnnexe {
  module: string;
  lignes: string[][];
}

/** Une annexe : un inventaire, une chaîne, ou un tableau. */
export interface Annexe {
  numero: string;
  titre: string;
  intro: string;
  colonnes: string[];
  /** Présent pour les annexes structurées par module. */
  groupes?: GroupeAnnexe[];
  /** Présent pour les annexes en liste continue. */
  lignes?: string[][];
}

export interface Manifeste {
  meta: {
    titre: string;
    sigle: string;
    sousTitre: string;
    edition: string;
    reference: string;
    resume: string;
  };
  identite: Identite[];
  avertissement: string;
  sections: Section[];
  annexes: Annexe[];
  cloture: string;
}

export const MANIFESTE = contenu as Manifeste;

/** Nombre de mesures outillées que contient le manifeste. */
export const NB_MESURES = MANIFESTE.sections.reduce(
  (total, section) => total + section.mesures.length,
  0,
);

/** Nombre de dispositions prohibitive, prohibitions comprises. */
export const NB_INTERDITS = MANIFESTE.sections.reduce(
  (total, section) => total + section.interdits.length,
  0,
);

/** Sommaire du manifeste, pour la navigation en haut de la page. */
export const SOMMAIRE = MANIFESTE.sections.map((section) => ({
  ancre: ancre(section.titre),
  numero: section.numero,
  titre: section.titre,
}));

/** Sommaire des annexes. */
export const SOMMAIRE_ANNEXES = MANIFESTE.annexes.map((annexe) => ({
  ancre: ancre(annexe.titre),
  numero: annexe.numero,
  titre: annexe.titre,
}));

/**
 * Ancre d'un titre.
 *
 * On ne dépend pas du générateur d'ancre du navigateur : deux titres voisins
 * ne doivent pas produire la même ancre, et l'accent doit être retiré de la
 * même manière partout.
 */
export function ancre(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
