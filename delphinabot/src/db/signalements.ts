/**
 * Signalements.
 *
 * Un membre signale un message ; la modération reçoit une file d'attente, pas
 * un message dans un salon qu'elle ne lit pas. Chaque signalement garde un
 * extrait court (400 caractères) : assez pour juger, trop court pour que le bot
 * devienne un registre de conversations privées.
 */

import { ligne, requete, versNombre } from "./index.js";

export type StatutSignalement = "ouvert" | "traite" | "rejete";

export interface Signalement {
  id: number;
  serveurId: string;
  salonId: string;
  auteurId: string;
  cibleId: string;
  raison: string;
  extrait: string;
  messageId: string | null;
  statut: StatutSignalement;
  resoluPar: string | null;
  creeLe: string;
}

function traduire(brut: Record<string, unknown>): Signalement {
  return {
    id: versNombre(brut.id),
    serveurId: String(brut.serveur_id ?? ""),
    salonId: String(brut.salon_id ?? ""),
    auteurId: String(brut.auteur_id ?? ""),
    cibleId: String(brut.cible_id ?? ""),
    raison: String(brut.raison ?? ""),
    extrait: String(brut.extrait ?? ""),
    messageId: brut.message_id ? String(brut.message_id) : null,
    statut: String(brut.statut ?? "ouvert") as StatutSignalement,
    resoluPar: brut.resolu_par ? String(brut.resolu_par) : null,
    creeLe: new Date(String(brut.cree_le ?? Date.now())).toISOString(),
  };
}

/** Dépose un signalement. */
export async function deposerSignalement(entree: {
  serveurId: string;
  salonId: string;
  auteurId: string;
  cibleId: string;
  raison: string;
  extrait: string;
  messageId: string | null;
}): Promise<Signalement> {
  const cree = await ligne(
    `INSERT INTO delphinabot_signalements
       (serveur_id, salon_id, auteur_id, cible_id, raison, extrait, message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      entree.serveurId,
      entree.salonId,
      entree.auteurId,
      entree.cibleId,
      entree.raison,
      entree.extrait.slice(0, 400),
      entree.messageId,
    ],
  );
  return traduire(cree ?? {});
}

/** Signalements ouverts, les plus anciens d'abord. */
export async function listerOuverts(serveurId: string, limite = 10): Promise<Signalement[]> {
  const lignes = await requete(
    `SELECT * FROM delphinabot_signalements
      WHERE serveur_id = $1 AND statut = 'ouvert'
      ORDER BY cree_le ASC
      LIMIT $2`,
    [serveurId, limite],
  );
  return lignes.map(traduire);
}

/** Clôture d'un signalement. */
export async function resoudreSignalement(
  id: number,
  statut: StatutSignalement,
  resoluPar: string,
): Promise<void> {
  await requete(
    `UPDATE delphinabot_signalements
        SET statut = $2, resolu_par = $3, resolu_le = now()
      WHERE id = $1`,
    [id, statut, resoluPar],
  );
}

/** Compte les signalements ouverts, affiché dans la barre d'état. */
export async function compterOuverts(serveurId: string): Promise<number> {
  const resultat = await ligne<{ total: string }>(
    `SELECT COUNT(*) AS total FROM delphinabot_signalements
      WHERE serveur_id = $1 AND statut = 'ouvert'`,
    [serveurId],
  );
  return versNombre(resultat?.total);
}
