/**
 * Journalisation.
 *
 * Sortie console, horodatée, filtrée par niveau. Aucun secret ne doit
 * transiter ici : les fonctions qui reçoivent un jeton ne le journalisent
 * jamais.
 */

const NIVEAUX = { debug: 10, info: 20, warn: 30, error: 40 };

let seuil = NIVEAUX.info;

/** Fixe le seuil de journalisation. À appeler avant tout autre module. */
export function definirNiveau(niveau) {
  if (NIVEAUX[niveau] !== undefined) seuil = NIVEAUX[niveau];
}

function ecrire(niveau, prefixe, message) {
  if (NIVEAUX[niveau] < seuil) return;
  const horodatage = new Date().toISOString().replace("T", " ").slice(0, 19);
  const ligne = `${horodatage} ${prefixe} ${message}`;
  if (niveau === "error") console.error(ligne);
  else if (niveau === "warn") console.warn(ligne);
  else console.log(ligne);
}

export const journal = {
  debug: (message) => ecrire("debug", "[debug ]", message),
  info: (message) => ecrire("info", "[info  ]", message),
  warn: (message) => ecrire("warn", "[alerte]", message),
  error: (message) => ecrire("error", "[erreur]", message),
};
