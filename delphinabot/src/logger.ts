/**
 * Journalisation.
 *
 * Sortie console, horodatée, filtrée par niveau. Aucun secret ne doit
 * transiter ici : les fonctions qui reçoivent un jeton ne le journalisent
 * jamais (voir `config.ts`, qui masque aussi l'URL de base au message d'erreur).
 */

import type { NiveauLog } from "./config.js";

const NIVEAUX: Record<NiveauLog, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let seuil = NIVEAUX.info;

/** Fixe le seuil de journalisation. À appeler avant tout autre module. */
export function definirNiveau(niveau: NiveauLog): void {
  seuil = NIVEAUX[niveau];
}

function ecrire(niveau: NiveauLog, prefixe: string, message: string): void {
  if (NIVEAUX[niveau] < seuil) return;
  const horodatage = new Date().toISOString().replace("T", " ").slice(0, 19);
  const ligne = `${horodatage} ${prefixe} ${message}`;
  if (niveau === "error") console.error(ligne);
  else if (niveau === "warn") console.warn(ligne);
  else console.log(ligne);
}

export const journal = {
  debug: (message: string) => ecrire("debug", "[debug]", message),
  info: (message: string) => ecrire("info", "[info ]", message),
  warn: (message: string) => ecrire("warn", "[alerte]", message),
  error: (message: string) => ecrire("error", "[erreur]", message),
};
