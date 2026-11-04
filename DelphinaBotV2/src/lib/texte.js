/**
 * Utilitaires de texte et de tirage.
 *
 * Le bot parle la même langue que ses membres : les comparaisons de noms
 * ignorent les accents et la casse, comme le fait Discord lui-même.
 */

import { randomInt } from "node:crypto";

/** Minuscules, sans accents, sans ponctuation ni espaces multiples. */
export function normaliser(valeur) {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Tirage uniforme dans un intervalle de nombres entiers, via la source sûre. */
export function entier(minimum, maximum) {
  if (maximum <= minimum) return minimum;
  return randomInt(minimum, maximum + 1);
}

/** Tirage uniforme dans un tableau. Renvoie `null` sur un tableau vide. */
export function choisir(elements) {
  if (!elements || elements.length === 0) return null;
  return elements[entier(0, elements.length - 1)] ?? null;
}

/** Mélange une copie d'un tableau (Fisher-Yates). */
export function melanger(elements) {
  const copie = [...elements];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = entier(0, i);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Remplace les `{cles}` d'un modèle par les valeurs fournies. */
export function remplir(modele, valeurs) {
  return String(modele).replace(/\{(\w+)\}/g, (correspondance, cle) =>
    valeurs[cle] !== undefined ? String(valeurs[cle]) : correspondance,
  );
}

/** Échappe ce qui pourrait casser un embed (accents graves de code, etc.). */
export function surligner(texte) {
  return String(texte ?? "").replace(/[`*_~|]/g, "");
}

/** Découpe un texte long en morceaux qui tiennent dans un message Discord. */
export function decouper(texte, taille = 1900) {
  const morceaux = [];
  let reste = String(texte ?? "");
  while (reste.length > taille) {
    let coupe = reste.lastIndexOf("\n", taille);
    if (coupe < taille * 0.5) coupe = taille;
    morceaux.push(reste.slice(0, coupe));
    reste = reste.slice(coupe);
  }
  if (reste.trim()) morceaux.push(reste);
  return morceaux;
}
