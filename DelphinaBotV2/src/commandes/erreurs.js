/**
 * Erreur destinée à l'utilisateur.
 *
 * Ce fichier existe pour une raison précise : les modules de commandes doivent
 * pouvoir signaler « cette saisie est invalide, dis-le tel quel au membre »
 * **sans importer le registre des commandes**. Importer le registre depuis une
 * commande crée un cycle d'import — le registre importe les commandes, qui
 * importent le registre — et un cycle casse l'initialisation dès que le
 * premier module chargé n'est pas le registre (par exemple depuis un test).
 *
 * Une erreur marquée `utilisateur` est affichée telle quelle ; toute autre
 * erreur devient « une erreur inattendue est survenue ».
 */
export class ErreurUtilisateur extends Error {
  constructor(message) {
    super(message);
    this.name = "ErreurUtilisateur";
    this.utilisateur = true;
  }
}
