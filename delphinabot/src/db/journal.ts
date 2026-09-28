/**
 * Journal d'activité.
 *
 * Une ligne par événement notable : connexion, verrouillage, raid détecté,
 * commande d'administration. Ce qui ne se trouve pas dans le journal n'existe
 * pas — c'est la seule mémoire fiable quand un membre conteste une sanction
 * trois mois plus tard.
 *
 * Le journal est volontairement limité en taille : le bot n'y conserve que des
 * faits, jamais le contenu des messages.
 */

import { requete, versNombre } from "./index.js";

export interface EntreeJournal {
  serveurId: string;
  type: string;
  utilisateurId: string | null;
  cibleId: string | null;
  details: Record<string, unknown>;
}

/** Ajoute une entrée au journal. N'échoue jamais sur un incident. */
export async function journaliser(entree: EntreeJournal): Promise<void> {
  await requete(
    `INSERT INTO delphinabot_journal (serveur_id, type, utilisateur_id, cible_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      entree.serveurId,
      entree.type,
      entree.utilisateurId,
      entree.cibleId,
      JSON.stringify(entree.details ?? {}),
    ],
  );
}

export interface LigneJournal {
  id: number;
  type: string;
  utilisateurId: string | null;
  cibleId: string | null;
  details: string;
  creeLe: string;
}

/** Entrées récentes d'un serveur. */
export async function lireJournal(serveurId: string, limite = 20): Promise<LigneJournal[]> {
  const lignes = await requete(
    `SELECT id, type, utilisateur_id, cible_id, details, cree_le
       FROM delphinabot_journal
      WHERE serveur_id = $1
      ORDER BY cree_le DESC
      LIMIT $2`,
    [serveurId, limite],
  );
  return lignes.map((brut) => ({
    id: versNombre(brut.id),
    type: String(brut.type),
    utilisateurId: brut.utilisateur_id ? String(brut.utilisateur_id) : null,
    cibleId: brut.cible_id ? String(brut.cible_id) : null,
    details: String(brut.details ?? "{}"),
    creeLe: new Date(String(brut.cree_le)).toISOString(),
  }));
}
