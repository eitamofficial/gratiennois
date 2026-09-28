/**
 * Essai de la base de données.
 *
 * Un bot de modération dont la base n'est pas en place ne produit aucun
 * message d'erreur utile : il se contente de ne rien faire. Ce script crée
 * le schéma, exerce chaque dépôt sur un serveur fictif, puis **supprime tout
 * ce qu'il a écrit**.
 *
 * Il se lance après l'installation, jamais en production dans la durée :
 *
 *     node dist/scripts/essai-base.js
 */

import { connexion, fermerBase, initierSchema, requete, transaction } from "../db/index.js";
import { chargerEnvironnement } from "../env.js";
import { enregistrerReglages, lireReglages } from "../db/serveur.js";
import {
  ajusterBanque,
  ajusterDucats,
  classement,
  lireMembre,
  rang,
  reclamerRecompense,
  retirerDucats,
  transferer,
  xpPourNiveau,
  niveauDepuisXp,
} from "../db/membres.js";
import { enregistrerSanction, leverToutes, listerSanctions } from "../db/sanctions.js";
import { journaliser, lireJournal } from "../db/journal.js";
import { deposerSignalement, listerOuverts, resoudreSignalement } from "../db/signalements.js";
import { demanderLien, lireLien, validerLien } from "../db/liens.js";
import { journal } from "../logger.js";

chargerEnvironnement();

/** Serveur et membres fictifs, supprimés à la fin. */
const SERVEUR = "000000000000000001";
const ALICE = "000000000000000002";
const BOB = "000000000000000003";

let reussis = 0;

function verifier(condition: boolean, quoi: string): void {
  if (!condition) throw new Error(`Échec : ${quoi}`);
  reussis += 1;
}

async function nettoyer(): Promise<void> {
  await requete(`DELETE FROM delphinabot_signalements WHERE serveur_id = $1`, [SERVEUR]);
  await requete(`DELETE FROM delphinabot_sanctions WHERE serveur_id = $1`, [SERVEUR]);
  await requete(`DELETE FROM delphinabot_journal WHERE serveur_id = $1`, [SERVEUR]);
  await requete(`DELETE FROM delphinabot_membres WHERE serveur_id = $1`, [SERVEUR]);
  await requete(`DELETE FROM delphinabot_serveurs WHERE serveur_id = $1`, [SERVEUR]);
  await requete(`DELETE FROM delphinabot_liens WHERE utilisateur_id = ANY($1)`, [[ALICE, BOB]]);
}

async function main(): Promise<void> {
  // Seul DATABASE_URL est lu ici, et non lireConfiguration() : cet essai ne
  // touche qu'a la base, et exiger un jeton Discord pour la Dissertation
  // empoisonnerait la premiere verification de l'installation. Le message
  // d'erreur d'un bot a moitie configure est le pire moment pour apprendre que
  // sa base fonctionne.
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL est absente. Renseignez-la dans delphinabot/.env, puis relancez.",
    );
  }
  connexion(databaseUrl);
  await initierSchema();

  await nettoyer();

  // --- Réglages ------------------------------------------------------------
  const reglages = await lireReglages(SERVEUR);
  verifier(reglages.serveurId === SERVEUR, "création automatique des réglages");
  verifier(reglages.antiRaid === true, "valeurs par défaut de l'anti-raid");

  const modifie = await enregistrerReglages(SERVEUR, { salonAlertes: "123", floodMax: 12 });
  verifier(modifie.salonAlertes === "123", "écriture d'un salon");
  verifier(modifie.floodMax === 12, "écriture d'un seuil");

  // --- Progression ---------------------------------------------------------
  verifier(niveauDepuisXp(0) === 0, "niveau à zéro XP");
  verifier(niveauDepuisXp(xpPourNiveau(3)) === 3, "niveau 3 atteint à son seuil exact");
  verifier(niveauDepuisXp(xpPourNiveau(3) - 1) === 2, "un point sous le seuil donne le niveau précédent");

  await lireMembre(SERVEUR, ALICE);
  await ajusterDucats(SERVEUR, ALICE, 100);
  verifier((await lireMembre(SERVEUR, ALICE)).ducats === 100, "crédit de ducats");
  await ajusterBanque(SERVEUR, ALICE, 40);
  verifier((await lireMembre(SERVEUR, ALICE)).banque === 40, "épargne séparée du portefeuille");
  verifier((await retirerDucats(SERVEUR, ALICE, 30)) === true, "retrait possible");
  verifier((await retirerDucats(SERVEUR, ALICE, 10_000)) === false, "refus d'un retrait impossible");

  const transfert = await transferer(SERVEUR, ALICE, BOB, 25);
  verifier(transfert.ok, "transfert accepté");
  verifier((await lireMembre(SERVEUR, ALICE)).ducats === 45, "solde de l'émetteur après transfert");
  verifier((await lireMembre(SERVEUR, BOB)).ducats === 25, "solde du destinataire après transfert");
  verifier((await transferer(SERVEUR, ALICE, BOB, 10_000)).ok === false, "transfert refusé sans solde");

  await transaction(async (client) => {
    await client.query(`UPDATE delphinabot_membres SET xp_total = 600 WHERE serveur_id = $1`, [SERVEUR]);
  });
  verifier((await classement(SERVEUR, "ducats", 5)).length >= 2, "classement alimenté");
  verifier((await rang(SERVEUR, ALICE)) === 1, "rang du premier du classement");
  verifier((await rang(SERVEUR, BOB)) === 2, "rang du second du classement");

  const jour = await reclamerRecompense(SERVEUR, BOB, 50);
  verifier(jour.montant === 50, "récompense quotidienne accordée");
  verifier((await reclamerRecompense(SERVEUR, BOB, 50)).montant === 0, "récompense refusée une seconde fois");

  // --- Sanctions -----------------------------------------------------------
  const sanction = await enregistrerSanction({
    serveurId: SERVEUR,
    utilisateurId: BOB,
    type: "avertissement",
    raison: "Essai",
    auteurId: ALICE,
  });
  verifier((await listerSanctions(SERVEUR, BOB)).length === 1, "sanction enregistrée");
  await leverToutes(SERVEUR, BOB, "avertissement", ALICE);
  const apres = await listerSanctions(SERVEUR, BOB);
  verifier(apres[0]?.levee === true, "sanction levée");
  verifier(sanction.id > 0, "sanction numérotée");

  // --- Journal, signalements, liens ----------------------------------------
  await journaliser({ serveurId: SERVEUR, type: "essai", utilisateurId: ALICE, cibleId: null, details: {} });
  verifier((await lireJournal(SERVEUR)).length === 1, "journal alimenté");

  const signalement = await deposerSignalement({
    serveurId: SERVEUR,
    salonId: "1",
    auteurId: ALICE,
    cibleId: BOB,
    raison: "Essai",
    extrait: "texte",
    messageId: null,
  });
  verifier((await listerOuverts(SERVEUR)).length === 1, "signalement ouvert");
  await resoudreSignalement(signalement.id, "traite", ALICE);
  verifier((await listerOuverts(SERVEUR)).length === 0, "signalement clôturé");

  await demanderLien(ALICE, "eitam");
  verifier((await lireLien(ALICE))?.verifie === false, "lien demandé, non vérifié");
  await validerLien(ALICE);
  verifier((await lireLien(ALICE))?.verifie === true, "lien vérifié");

  await nettoyer();
  await fermerBase();

  console.log(`Essai terminé : ${reussis} vérifications passées, données de test supprimées.`);
}

main().catch(async (erreurReçue: unknown) => {
  journal.error(`Essai interrompu : ${(erreurReçue as Error).message}`);
  console.error(`\nÉchec de l'essai : ${(erreurReçue as Error).message}\n`);
  await nettoyer().catch(() => undefined);
  await fermerBase().catch(() => undefined);
  process.exit(1);
});
