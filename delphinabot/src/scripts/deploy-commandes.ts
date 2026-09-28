/**
 * Déploiement des commandes slash.
 *
 * Deux modes, choisis par la variable `DISCORD_GUILD_ID` :
 *
 * - **avec** identifiant de serveur : les commandes apparaissent
 *   immédiatement, dans ce seul serveur. C'est le mode de travail.
 * - **sans** : les commandes sont publiées globalement, et Discord peut
 *   mettre jusqu'à une heure à les propager. C'est le mode de diffusion.
 *
 * Les deux écritures utilisent la même liste de commandes que le bot, donc
 * l'aide ne peut pas annoncer une commande absente de Discord.
 *
 *     node dist/scripts/deploy-commandes.js
 */

import { REST, Routes } from "discord.js";
import { ErreurConfiguration, lireConfiguration } from "../config.js";
import { chargerEnvironnement } from "../env.js";
import { TOUTES_LES_COMMANDES } from "../commandes/index.js";
import { journal } from "../logger.js";

chargerEnvironnement();

async function main(): Promise<void> {
  const configuration = lireConfiguration();
  const corps = TOUTES_LES_COMMANDES.map((element) => element.donnees.toJSON());

  const rest = new REST({ version: "10" }).setToken(configuration.jeton);
  const chemin = configuration.guildId
    ? Routes.applicationGuildCommands(configuration.clientId, configuration.guildId)
    : Routes.applicationCommands(configuration.clientId);

  journal.info(
    `Envoi de ${corps.length} commandes vers ${configuration.guildId ?? "tous les serveurs"}...`,
  );
  const resultat = await rest.put(chemin, { body: corps });
  journal.info(`Commandes enregistrées : ${(resultat as unknown[]).length}.`);

  if (!configuration.guildId) {
    journal.warn(
      "Publication globale : Discord peut mettre jusqu'à une heure à propager ces commandes.",
    );
  }
}

main().catch((erreurReçue: unknown) => {
  if (erreurReçue instanceof ErreurConfiguration) {
    console.error(`\n[DelphinaBot] ${erreurReçue.message}\n`);
  } else {
    console.error("[DelphinaBot] Déploiement impossible :", erreurReçue);
  }
  process.exit(1);
});
