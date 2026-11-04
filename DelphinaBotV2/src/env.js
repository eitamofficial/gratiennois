/**
 * Chargement du fichier `.env`.
 *
 * Le bot a une seule dépendance applicative (`discord.js`) : on n'en ajoute pas
 * une seconde juste pour lire un fichier de quinze lignes. Le format est
 * volontairement minimal — `CLE=valeur`, une entrée par ligne, `#` pour un
 * commentaire. Ce qui est déjà présent dans l'environnement gagne toujours :
 * c'est ce qui permet de lancer le bot depuis une tâche planifiée sans
 * dépendre du fichier.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Racine du projet `DelphinaBotV2/`. */
export const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Fichiers lus, dans l'ordre : le premier qui définit une clé l'emporte. */
const FICHIERS = [join(RACINE, ".env.local"), join(RACINE, ".env")];

/** Lit un fichier `.env` et injecte les paires absentes de l'environnement. */
export function chargerEnv(chemin) {
  if (!existsSync(chemin)) return;

  for (const ligne of readFileSync(chemin, "utf8").split(/\r?\n/)) {
    const propre = ligne.trim();
    if (!propre || propre.startsWith("#")) continue;

    const separation = propre.indexOf("=");
    if (separation <= 0) continue;

    const cle = propre.slice(0, separation).trim();
    const valeur = propre
      .slice(separation + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (process.env[cle] === undefined) process.env[cle] = valeur;
  }
}

/** Charge tous les fichiers d'environnement connus du bot. */
export function chargerEnvironnement() {
  for (const fichier of FICHIERS) chargerEnv(fichier);
}
