/**
 * Verrou d'instance unique.
 *
 * Deux DelphinaBot lancés en même temps avec le même jeton est la panne la
 * plus déroutante qui soit : Discord livre chaque interaction à **toutes** les
 * sessions ouvertes, les deux processus essaient de répondre, et un seul y
 * arrive. L'autre journalise « Unknown interaction » (10062) et la commande
 * paraît cassée — alors qu'elle a été traitée par un processus invisible, lancé
 * dans une autre fenêtre ou resté d'une session précédente.
 *
 * Le second risque est plus silencieux : les deux instances écrivent le même
 * fichier `data/delphinabot.json`, et la dernière écriture écrase le travail de
 * l'autre.
 *
 * D'où ce verrou, posé **avant** l'ouverture du stockage : un fichier contenant
 * le PID du processus qui travaille. S'il désigne un processus vivant, le
 * démarrage s'arrête net avec un message qui dit quoi faire ; sinon — arrêt
 * brutal, coupure de courant — le verrou est repris sans discussion.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { journal } from "./logger.js";

/** Erreur affichée telle quelle au démarrage, sans trace de pile. */
export class ErreurVerrou extends Error {}

/** Nom du fichier de verrou, à côté des données du bot. */
const NOM_FICHIER = "delphinabot.verrou";

/** Le processus portant ce PID existe-t-il encore ? */
function processusVivant(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    // Signal 0 : aucune action, seulement le test d'existence.
    process.kill(pid, 0);
    return true;
  } catch (erreur) {
    // EPERM veut dire « il existe, mais il n'est pas à moi » : il est vivant.
    return erreur.code === "EPERM";
  }
}

/** Contenu du verrou, ou `null` s'il est absent ou illisible. */
function lire(chemin) {
  if (!existsSync(chemin)) return null;
  try {
    const brut = JSON.parse(readFileSync(chemin, "utf8"));
    return {
      pid: Number.parseInt(String(brut.pid), 10),
      depuis: typeof brut.depuis === "string" ? brut.depuis : null,
    };
  } catch {
    return null;
  }
}

/**
 * Prend le verrou, ou explique pourquoi c'est impossible.
 *
 * Renvoie de quoi le relâcher à l'arrêt. Lève `ErreurVerrou` si une autre
 * instance tourne réellement.
 */
export function prendreVerrou(racine) {
  const chemin = join(racine, "data", NOM_FICHIER);
  mkdirSync(dirname(chemin), { recursive: true });

  const existant = lire(chemin);
  if (existant && processusVivant(existant.pid)) {
    throw new ErreurVerrou(
      `Une autre instance de DelphinaBot tourne déjà (PID ${existant.pid}${
        existant.depuis ? `, démarrée le ${existant.depuis}` : ""
      }).\n` +
        "Deux instances avec le même jeton se disputent les mêmes interactions : Discord n'en\n" +
        "accepte qu'une par commande, et l'autre journalise « Unknown interaction ».\n" +
        `Arrêtez l'autre instance (Ctrl+C dans sa fenêtre), ou supprimez ${chemin}\n` +
        "si elle s'est arrêtée brutalement.",
    );
  }

  if (existant) {
    journal.warn(`Verrou repris : le processus ${existant.pid} n'existe plus.`);
  }

  const contenu = { pid: process.pid, depuis: new Date().toISOString() };
  writeFileSync(chemin, `${JSON.stringify(contenu, null, 2)}\n`, "utf8");

  let relache = false;
  const liberer = () => {
    if (relache) return;
    relache = true;
    // On ne supprime le verrou que s'il est encore le nôtre : une instance
    // relancée entre-temps ne doit pas se retrouver sans verrou par notre faute.
    const actuel = lire(chemin);
    if (!actuel || actuel.pid === process.pid) rmSync(chemin, { force: true });
  };

  // Dernier filet : quel que soit le chemin de sortie, le verrou tombe.
  process.on("exit", liberer);

  return { chemin, liberer };
}
