/**
 * L'œuf.
 *
 * Tout ce qui concerne la cache secrète est réuni ici : le nom de la porte, les
 * mots qui l'ouvrent et le code de secours. Isoler ces quelques constantes évite
 * de les retrouver éparpillés dans deux composants, et permet de les modifier
 * sans toucher à l'affichage.
 */

import { OEUFS, type Oeuf } from "./oeufs";
/** Clé de persistance, dans le navigateur du visiteur. */
export const CLE_OEUF = "gratianopolis.oeuf";

/**
 * Les mots qui ouvrent la porte.
 *
 * Le premier est le vrai : `eshep` est la traduction anglaise de « la loba », le
 * titre de l/album de 2009 et de son morceau le plus emblématique. Un visiteur
 * qui ne connaît pas l'artiste ne tombera dessus par hasard.
 *
 * Les suivants sont volontairement plus permissifs, pour
 * que le fan qui hésite sur l'orthographe ne repart pas sans rien. Le code
 * Konami complète la liste : c'est le déverrouillage classique, connu de tous
 * ceux qui ont growlé sur ce genre de page.
 */
export const MOTS_DE_PASSE = ["eshep", "laloba", "waka waka", "she wolf"] as const;

/** Code Konami, dans l'ordre exact où il doit être saisi. */
export const CODE_KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

/** Durée sans frappe après laquelle la saisie en cours est abandonnée. */
export const DELAI_LECTURE_MS = 2500;

/**
 * La frappe vient-elle d'ouvrir la porte ?
 *
 * Fonction pure, volontairement sortie du composant : c'est la seule partie du
 * déverrouillage qui puisse se tromper, et elle doit pouvoir être éprouvée sans
 * navigateur. On accepte le mot seul ou suivi d'une espace, pour qu'un visiteur
 * qui tape une phrase plus longue tombe quand même dessus.
 */
export function detecterMotSecret(tampon: string): boolean {
  const tenu = normaliserSaisie(tampon);
  return MOTS_DE_PASSE.some((mot) => tenu === mot || tenu.endsWith(` ${mot}`));
}

/**
 * La suite de touches vient-elle de terminer le code Konami ?
 *
 * La comparaison se fait sur la fin de l'historique seulement : les touches
 * frappées avant la séquence restent sans effet, ce qui évite d'exiger une
 *guide de frappe parfaite.
 */
export function detecterKonami(historique: string[]): boolean {
  if (historique.length < CODE_KONAMI.length) return false;
  const debut = historique.length - CODE_KONAMI.length;
  return CODE_KONAMI.every((attendu, i) => historique[debut + i] === attendu);
}

/** Mot du second niveau, révélé une fois dans la cache. */
export const MOT_DU_SECOND_NIVEAU = "loba";

function estVide(valeur: string | null): boolean {
  return valeur === null || valeur === "";
}

/**
 * On ne garde que les lettres, les chiffres et les espaces.
 *
 * Sans cette normalisation, le mot attendu dépendrait de la disposition du
 * clavier du visiteur : sur un clavier hollandais, la touche `s` produit autre
 * chose, et le mot serait refusé alors même qu'il a été correctement tapé.
 *
 * Les accents sont **transcrits** et non supprimés. Supprimer suffirait pour
 * « eshep », dont aucune lettre n'est accentuée, mais un visiteur qui tape
 * « lóbá » verrait son mot réduit à « lb » et la porte resterait close alors
 * qu'il a bien écrit ce qu'il fallait.
 *
 * Les espaces de début et de fin disparaissent également : sans cela, un mot
 * suivi d'une espace cesserait d'être reconnu, alors que c'est la saisie la plus
 * naturelle du monde.
 */
export function normaliserSaisie(cle: string): string {
  return cle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function aDejaOuvertLaPorte(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !estVide(window.localStorage.getItem(CLE_OEUF));
  } catch {
    // Navigateur verrouillé ou stockage refusé : on suppose simplement que la
    // porte est encore fermée, ce qui est le comportement prudent.
    return false;
  }
}

export function ouvrirLaPorte(): void {
  try {
    window.localStorage.setItem(CLE_OEUF, "1");
  } catch {
    // Sans stockage la page secrets s'ouvrira quand même pour la session en
    // cours ; seule la visite suivante devra recommencer.
  }
}

// ---------------------------------------------------------------------------
// Le suivi des quinze découvertes
// ---------------------------------------------------------------------------

/** Clé de la liste des œufs trouvés, distincte de celle de la porte. */
export const CLE_DECOUVERTES = "gratianopolis.oeufs";

/** Les identifiants déjà trouvés, dans l'ordre où ils ont été trouvés. */
export function decouvertes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLE_DECOUVERTES);
    if (!brut) return [];
    const lu = JSON.parse(brut);
    return Array.isArray(lu) ? lu.filter((v): v is string => typeof v === "string") : [];
  } catch {
    // Un contenu illisible ne doit pas empêcher le site de fonctionner : on
    // repart d'un relevé vierge plutôt que de lever.
    return [];
  }
}

/** Note une découverte. La liste reste ordonnée et sans doublon. */
export function noterDecouverte(id: string): string[] {
  const deja = decouvertes();
  if (deja.includes(id)) return deja;
  const mise = [...deja, id];
  try {
    window.localStorage.setItem(CLE_DECOUVERTES, JSON.stringify(mise));
  } catch {
    // Stockage refusé : la page s'ouvre quand même, seule la liste est perdue.
  }
  return mise;
}

/** La liste est-elle vide ? Aucune découverte n'a encore été notée. */
export function aucuneDecouverte(): boolean {
  return decouvertes().length === 0;
}

// ---------------------------------------------------------------------------
// La description d'une touche
// ---------------------------------------------------------------------------

/**
 * Ramène un événement clavier à un jeton comparable.
 *
 * Sans cela, impossible d'exiger une majuscule : l'événement qui produit `H`
 * n'a pas les mêmes propriétés que celui qui produit `h`. On note donc
 * explicitement la touche de modification, en majuscule, pour que la séquence
 * attendue et la frappe réelle ne puissent pas diverger.
 */
export function decrireTouche(evenement: KeyboardEvent): string {
  const touche = evenement.key;
  if (touche === " ") return "espace";
  if (touche.length === 1 && /[A-Z]/.test(touche)) return `Shift+${touche.toLowerCase()}`;
  return touche;
}

// ---------------------------------------------------------------------------
// La reconnaissance d'un œuf parmi les quinze
// ---------------------------------------------------------------------------

/** Ce que l'écouteur sait sur ce qui vient d'être frappé. */
export interface Entree {
  /** Saisie récente, passée au propre. */
  normalise: string;
  /** Saisie récente, telle que frappée. */
  brut: string;
  /** Derniers jetons de touches, du plus ancien au plus récent. */
  touches: string[];
}

function seTerminePar(texte: string, suffixe: string): boolean {
  return texte.endsWith(suffixe) || texte.endsWith(` ${suffixe}`);
}

/**
 * Quel œuf vient d'être trouvé, s'il y en a un ?
 *
 * La fonction est pure et vit dans le module plutôt que dans le composant : la
 * reconnaissance est la seule partie qui puisse se tromper, et elle doit
 * pouvoir être éprouvée sans navigateur.
 *
 * Un mot se compare au texte normalisé, **sauf** s'il est écrit hors alphabet
 * latin. La normalisation efface tout ce qui n'est pas une lettre anglaise, ce
 * qui viderait le mot arabe de l'entrée consacrée à ses racines : dans ce cas
 * la comparaison se fait sur la saisie brute.
 */
export function detecterOeuf(entree: Entree): Oeuf | null {
  for (const oeuf of OEUFS) {
    if (oeuf.verrou.genre === "touches") {
      const attendu = oeuf.verrou.valeur;
      if (entree.touches.length < attendu.length) continue;
      const debut = entree.touches.length - attendu.length;
      if (attendu.every((jeton, i) => entree.touches[debut + i] === jeton)) return oeuf;
      continue;
    }
    const mot = oeuf.verrou.valeur.toLowerCase();
    const horsLatin = [...mot].some((c) => (c.codePointAt(0) ?? 0) > 126);
    if (seTerminePar(horsLatin ? entree.brut : entree.normalise, horsLatin ? mot : normaliserSaisie(mot))) {
      return oeuf;
    }
  }
  return null;
}
