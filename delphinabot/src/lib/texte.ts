/**
 * Utilitaires de texte.
 *
 * Le bot parle la même langue que ses membres : la détection d'usurpation
 * (« Delphinabot » pour « DelphinaBot ») ne peut pas reposer sur une
 * comparaison brute, car Discord ignore lui-même la casse et les accents.
 */

import { randomInt } from "node:crypto";

/** Minuscules, sans accents, sans ponctuation ni espaces multiples. */
export function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Distance de Levenshtein, bornée à `maximum`.
 *
 * La borne n'est pas une optimisation : au-delà, on ne s'intéresse plus à la
 * différence, et les lignes de la matrice inutile coûtent cher sur un serveur
 * où l'appel est fait pour chaque message.
 */
export function distance(a: string, b: string, maximum = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maximum) return maximum + 1;

  let precedente = Array.from({ length: b.length + 1 }, (_, index) => index);
  let courante = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    courante[0] = i;
    let minimum = courante[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
      if (courante[j] < minimum) minimum = courante[j];
    }
    if (minimum > maximum) return maximum + 1;
    [precedente, courante] = [courante, precedente];
  }

  return precedente[b.length];
}

/**
 * Deux noms sont-ils proches au point de confondre l'usurpation ?
 *
 * Le seuil est proportionnel à la longueur : « Bob » et « Bo » ne se
 * confondent pas, « DelphinaBot » et « Delphinabot » si.
 */
export function ressemblant(a: string, b: string): boolean {
  const gauche = normaliser(a);
  const droite = normaliser(b);
  if (!gauche || !droite) return false;
  if (gauche === droite) return true;

  const longueur = Math.max(gauche.length, droite.length);
  if (longueur < 5) return false;
  return distance(gauche, droite, Math.max(1, Math.floor(longueur / 4))) <= 1;
}

/** Découpe un texte en mots, sans les répétitions triviales. */
export function mots(valeur: string): string[] {
  return normaliser(valeur).split(" ").filter(Boolean);
}

const EXPRESSION_LIEN = /(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** Tous les liens d'un message, dans l'ordre. */
export function extraireLiens(texte: string): string[] {
  return texte.match(EXPRESSION_LIEN) ?? [];
}

/** Nom de domaine d'une URL, en minuscules, `www` retiré. */
export function domaine(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Un message contient-il une mention de rôle ou de personne en masse ? */
export function compterMentions(texte: string): number {
  return (texte.match(/@(?:everyone|here|[!&]?\d{15,22})/g) ?? []).length;
}

/** Tirage uniforme dans un intervalle de nombres entiers, via la source sûre. */
export function entier(minimum: number, maximum: number): number {
  if (maximum <= minimum) return minimum;
  return randomInt(minimum, maximum + 1);
}

/** Tirage uniforme dans un tableau. Renvoie `undefined` sur un tableau vide. */
export function choisir<T>(elements: readonly T[]): T | undefined {
  if (elements.length === 0) return undefined;
  return elements[entier(0, elements.length - 1)];
}

/** Mélange une copie d'un tableau (Fisher-Yates). */
export function melanger<T>(elements: readonly T[]): T[] {
  const copie = [...elements];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = entier(0, i);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
