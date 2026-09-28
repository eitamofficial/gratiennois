/**
 * Point d'entrée de DelphinaBot.
 *
 * L'ordre des opérations est le point important de ce fichier :
 *
 * 1. charger le `.env` ;
 * 2. lire la configuration, **en échouant** s'il manque une variable ;
 * 3. ouvrir la base et vérifier le schéma ;
 * 4. seulement ensuite, se connecter à Discord.
 *
 * Inverser l'ordre 2 et 4 est l'erreur classique : le bot se connecte, puis
 * plante en répétant « DISCORD_BOT_TOKEN absent » toutes les dix minutes
 * dans un journal que personne ne lit.
 */

import { ErreurConfiguration, lireConfiguration } from "./config.js";
import { chargerEnvironnement } from "./env.js";
import { Delphinabot } from "./client.js";
import { connexion, fermerBase, initierSchema } from "./db/index.js";
import { installerRouteur } from "./core/routeur.js";
import { installerEvenements } from "./evenements.js";
import { definirNiveau, journal } from "./logger.js";
import { TOUTES_LES_COMMANDES } from "./commandes/index.js";

chargerEnvironnement();

async function principal(): Promise<void> {
  const configuration = lireConfiguration();
  definirNiveau(configuration.niveauLog);

  journal.info("Ouverture de la base de données...");
  connexion(configuration.databaseUrl);
  await initierSchema();

  const bot = new Delphinabot(configuration);
  for (const commande of TOUTES_LES_COMMANDES) {
    bot.enregistrerCommande(commande);
  }

  installerRouteur(bot);
  installerEvenements(bot);

  await bot.login(configuration.jeton);
  journal.info("Connexion réussie.");
}

/** Arrêt propre : on coupe Discord, puis la base. */
function installerArrets(bot: Delphinabot | null): void {
  let arrete = false;

  const arreter = async (raison: string) => {
    if (arrete) return;
    arrete = true;
    journal.info(`Arrêt demandé (${raison})...`);
    try {
      await bot?.destroy();
    } catch {
      // Une coupure déjà en cours n'a rien à raconter.
    }
    await fermerBase().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void arreter("SIGINT"));
  process.on("SIGTERM", () => void arreter("SIGTERM"));
  process.on("unhandledRejection", (raison) => {
    journal.error(`Promesse rejetée sans gestion : ${String(raison)}`);
  });
  process.on("uncaughtException", (erreur) => {
    journal.error(`Exception non rattrapée : ${erreur.message}`);
  });
}

installerArrets(null);

principal().catch((erreurReçue: unknown) => {
  if (erreurReçue instanceof ErreurConfiguration) {
    console.error(`\n[DelphinaBot] Configuration incorrecte.\n${erreurReçue.message}\n`);
  } else {
    console.error("\n[DelphinaBot] Démarrage impossible :", erreurReçue, "\n");
  }
  process.exit(1);
});
