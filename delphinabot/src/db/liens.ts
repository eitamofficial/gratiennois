/**
 * Liens vérifiés entre un compte Discord et une page du wiki.
 *
 * C'est le socle de la « vérification des liens de rôles » du portail
 * Discord : un membre revendique une identité du wiki, le bot lui délivre un
 * rôle Discord, et le wiki n'affiche la page qu'une fois le lien validé. Le
 * lien est stocké ici, par compte Discord : c'est la seule table du bot qui
 * survit à un bannissement, et c'est volontaire — une identité vérifiée ne
 * disparaît pas parce qu'un member est parti.
 */

import { ligne, requete } from "./index.js";

export interface Lien {
  utilisateurId: string;
  slug: string;
  verifie: boolean;
  creeLe: string;
  verifieLe: string | null;
}

function traduire(brut: Record<string, unknown> | null): Lien | null {
  if (!brut) return null;
  return {
    utilisateurId: String(brut.utilisateur_id),
    slug: String(brut.slug),
    verifie: brut.verifie === true,
    creeLe: new Date(String(brut.cree_le)).toISOString(),
    verifieLe: brut.verifie_le ? new Date(String(brut.verifie_le)).toISOString() : null,
  };
}

/** Demande de lien, en attente de vérification. */
export async function demanderLien(utilisateurId: string, slug: string): Promise<Lien> {
  const existe = await ligne(
    `UPDATE delphinabot_liens
        SET slug = $2, verifie = false, verifie_le = NULL
      WHERE utilisateur_id = $1
      RETURNING *`,
    [utilisateurId, slug],
  );
  if (existe) return traduire(existe)!;

  const cree = await ligne(
    `INSERT INTO delphinabot_liens (utilisateur_id, slug) VALUES ($1, $2) RETURNING *`,
    [utilisateurId, slug],
  );
  return traduire(cree)!;
}

/** Valide un lien. Renvoie `null` si la demande n'existe pas. */
export async function validerLien(utilisateurId: string): Promise<Lien | null> {
  const valide = await ligne(
    `UPDATE delphinabot_liens
        SET verifie = true, verifie_le = now()
      WHERE utilisateur_id = $1
      RETURNING *`,
    [utilisateurId],
  );
  return traduire(valide);
}

/** Retire un lien (le membre ne revendique plus d'identité). */
export async function supprimerLien(utilisateurId: string): Promise<void> {
  await requete(`DELETE FROM delphinabot_liens WHERE utilisateur_id = $1`, [utilisateurId]);
}

/** Lien d'un compte, s'il en existe un. */
export async function lireLien(utilisateurId: string): Promise<Lien | null> {
  const trouve = await ligne(`SELECT * FROM delphinabot_liens WHERE utilisateur_id = $1`, [
    utilisateurId,
  ]);
  return traduire(trouve);
}

/** Identifiants Discord de tous les liens validés pour un slug donné. */
export async function identifiantsPourSlug(slug: string): Promise<string[]> {
  const lignes = await requete<{ utilisateur_id: string }>(
    `SELECT utilisateur_id FROM delphinabot_liens WHERE slug = $1 AND verifie = true`,
    [slug],
  );
  return lignes.map((element) => element.utilisateur_id);
}
