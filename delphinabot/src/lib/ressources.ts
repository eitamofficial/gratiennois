/**
 * Ressources textuelles du bot.
 *
 * Questions de quiz, citations, décrets, articles du marché : tout ce que le
 * bot peut dire tient dans des fichiers JSON, versionnés et relus à la
 * demande. Les mettre dans le code obligerait à recompiler pour corriger une
 * faute de frappe — ce qui, sur un bot de cher, est une contrainte absurde.
 *
 * Le cache est par fichier et vit le temps du processus : un JSON de quelques
 * kilo-octets n'a pas à être relu à chaque commande, mais doit pouvoir être
 * corrigé en relançant le bot.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOSSIER_RESSOURCES } from "../config.js";

const cache = new Map<string, unknown>();

/** Lit un JSON du dossier `ressources/`, en le gardant en mémoire. */
export function ressource<T>(nom: string): T {
  const enCache = cache.get(nom);
  if (enCache !== undefined) return enCache as T;

  const chemin = join(DOSSIER_RESSOURCES, `${nom}.json`);
  const brut = JSON.parse(readFileSync(chemin, "utf8")) as T;
  cache.set(nom, brut);
  return brut;
}
