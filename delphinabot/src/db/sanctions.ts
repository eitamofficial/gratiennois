/**
 * Historique des sanctions.
 *
 * Une sanction n'est jamais effacée : elle est *levée*. C'est la seule façon
 * d'avoir un dossier honnête — « ce membre a été sanctionné deux fois l'an
 * dernier » est une information que la modération utilise, et qu'un `DELETE`
 * ferait disparaître.
 */

import { ligne, requete, versNombre } from "./index.js";

export type TypeSanction =
  | "avertissement"
  | "delai"
  | "sourdine"
  | "exclusion"
  | "bannissement";

/** Libellés affichés, tous en français. */
export const LIBELLES_SANCTION: Record<TypeSanction, string> = {
  avertissement: "Avertissement",
  delai: "Mise en sourdine temporaire",
  sourdine: "Mise en sourdine",
  exclusion: "Exclusion du serveur",
  bannissement: "Bannissement",
};

export interface Sanction {
  id: number;
  serveurId: string;
  utilisateurId: string;
  type: TypeSanction;
  raison: string;
  auteurId: string;
  dureeMs: number | null;
  expireLe: string | null;
  levee: boolean;
  leveePar: string | null;
  contestee: boolean;
  creeLe: string;
}

function traduire(brut: Record<string, unknown>): Sanction {
  return {
    id: versNombre(brut.id),
    serveurId: String(brut.serveur_id ?? ""),
    utilisateurId: String(brut.utilisateur_id ?? ""),
    type: String(brut.type ?? "avertissement") as TypeSanction,
    raison: String(brut.raison ?? ""),
    auteurId: String(brut.auteur_id ?? ""),
    dureeMs: brut.duree_ms === null || brut.duree_ms === undefined ? null : versNombre(brut.duree_ms),
    expireLe: brut.expire_le ? new Date(String(brut.expire_le)).toISOString() : null,
    levee: brut.levee === true,
    leveePar: brut.levee_par ? String(brut.levee_par) : null,
    contestee: brut.contestee === true,
    creeLe: new Date(String(brut.cree_le ?? Date.now())).toISOString(),
  };
}

/** Inscrit une sanction et renvoie la ligne créée. */
export async function enregistrerSanction(entree: {
  serveurId: string;
  utilisateurId: string;
  type: TypeSanction;
  raison: string;
  auteurId: string;
  dureeMs?: number | null;
}): Promise<Sanction> {
  const expireLe =
    entree.dureeMs && entree.dureeMs > 0
      ? new Date(Date.now() + entree.dureeMs).toISOString()
      : null;

  const creee = await ligne(
    `INSERT INTO delphinabot_sanctions
       (serveur_id, utilisateur_id, type, raison, auteur_id, duree_ms, expire_le)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      entree.serveurId,
      entree.utilisateurId,
      entree.type,
      entree.raison,
      entree.auteurId,
      entree.dureeMs ?? null,
      expireLe,
    ],
  );
  return traduire(creee ?? {});
}

/** Historique d'un membre, du plus récent au plus ancien. */
export async function listerSanctions(
  serveurId: string,
  utilisateurId: string,
  limite = 10,
): Promise<Sanction[]> {
  const lignes = await requete(
    `SELECT * FROM delphinabot_sanctions
      WHERE serveur_id = $1 AND utilisateur_id = $2
      ORDER BY cree_le DESC
      LIMIT $3`,
    [serveurId, utilisateurId, limite],
  );
  return lignes.map((ligneSql) => traduire(ligneSql));
}

/** Dernière sanction d'un type donné, encore active. */
export async function sanctionActive(
  serveurId: string,
  utilisateurId: string,
  type: TypeSanction,
): Promise<Sanction | null> {
  const trouvee = await ligne(
    `SELECT * FROM delphinabot_sanctions
      WHERE serveur_id = $1 AND utilisateur_id = $2 AND type = $3
        AND levee = false
      ORDER BY cree_le DESC
      LIMIT 1`,
    [serveurId, utilisateurId, type],
  );
  return trouvee ? traduire(trouvee) : null;
}

/** Sanctions encore actives et expirées : le tour de fond les lève. */
export async function sanctionsExpirees(maintenant = new Date()): Promise<Sanction[]> {
  const lignes = await requete(
    `SELECT * FROM delphinabot_sanctions
      WHERE levee = false
        AND expire_le IS NOT NULL
        AND expire_le <= $1`,
    [maintenant.toISOString()],
  );
  return lignes.map((ligneSql) => traduire(ligneSql));
}

/** Marque une sanction comme levée. */
export async function leverSanction(id: number, leveePar: string): Promise<void> {
  await requete(
    `UPDATE delphinabot_sanctions
        SET levee = true, levee_par = $2, levee_le = now()
      WHERE id = $1 AND levee = false`,
    [id, leveePar],
  );
}

/** Marque toutes les sanctions actives d'un membre comme levées. */
export async function leverToutes(
  serveurId: string,
  utilisateurId: string,
  type: TypeSanction,
  leveePar: string,
): Promise<number> {
  const lignes = await requete<{ id: string }>(
    `UPDATE delphinabot_sanctions
        SET levee = true, levee_par = $4, levee_le = now()
      WHERE serveur_id = $1 AND utilisateur_id = $2 AND type = $3 AND levee = false
      RETURNING id`,
    [serveurId, utilisateurId, type, leveePar],
  );
  return lignes.length;
}

/** Nombre d'infractions actives, pour l'alerte d'escalade. */
export async function compterActives(serveurId: string, utilisateurId: string): Promise<number> {
  const resultat = await ligne<{ total: string }>(
    `SELECT COUNT(*) AS total FROM delphinabot_sanctions
      WHERE serveur_id = $1 AND utilisateur_id = $2 AND levee = false`,
    [serveurId, utilisateurId],
  );
  return versNombre(resultat?.total);
}
