/**
 * Migration 0001 — exemple de renommage d'une charge constitutionnelle.
 *
 * ⚠  Cette migration n'est volontairement PAS appliquée : `roles` est vide.
 *    Elle sert de modèle. Pour l'exécuter après modification, copiez le fichier
 *    (par exemple `0002_baillit_bailli.mjs`) et renseignez :
 *
 *      roles:   { ancien_rôle: nouveau_rôle }  → réécrit WIKI_USERS (.env)
 *      authors: { "Ancien Libellé": "Nouveau Libellé" } → réécrit le champ
 *                                                   `author` des articles et
 *                                                   des révisions (JSON et PostgreSQL)
 *
 * Rappel : le nouveau rôle doit exister dans `USER_ROLES`
 * (src/lib/types.ts) **avant** d'appliquer la migration, sinon le compte se
 * retrouvera sans droits.
 */
export default {
  id: "0001_exemple_charge",
  description: "Modèle de renommage d'une charge (aucun effet tant que vide).",
  roles: {},
  authors: {},
};
