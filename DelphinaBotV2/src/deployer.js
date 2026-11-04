/**
 * Déploiement des commandes slash.
 *
 * Le bot est conçu pour **un** serveur : les commandes sont donc publiées dans
 * le serveur déclaré par `DISCORD_GUILD_ID`, où elles apparaissent
 * immédiatement. Sans identifiant de serveur, elles sont publiées globalement
 * et Discord peut mettre jusqu'à une heure à les propager.
 *
 * L'**autre portée est effacée après l'écriture**, jamais avant. Une commande
 * publiée par une version précédente sous une autre portée continuerait sinon
 * de s'afficher, en doublon de la nouvelle : pour Discord, une commande globale
 * et une commande de serveur qui portent le même nom sont deux entrées
 * distinctes. Mais effacer d'abord est le moyen le plus sûr de laisser le
 * serveur sans aucune commande quand la limite de créations du jour est
 * atteinte : on écrit donc ce qui doit vivre, puis on retire ce qui doit
 * mourir.
 *
 *     npm run commandes
 *
 * Attention à une limite de Discord : une application ne peut **créer** que
 * 200 commandes par jour. Chaque écriture compte autant de créations qu'elle
 * envoie de commandes, ce qui rend les redéploiements répétés coûteux. Quand
 * la limite est atteinte, Discord répond 429 et le client attend — le script
 * paraît alors figé. Le journal le dit désormais explicitement, avec le délai
 * annoncé par Discord.
 *
 * Deux conséquences ont été tirées de cette limite :
 *
 *  - une portée déjà à jour **n'est pas réécrite** — la comparaison porte sur
 *    les noms, les descriptions et les options, pas sur les objets bruts que
 *    Discord enrichit (`id`, `version`, `contexts`…) : relancer la commande
 *    pour rien ne coûte donc aucune création ;
 *  - si la publication dans le serveur est refusée, celle du niveau global est
 *    sautée quand les commandes globales déjà en place sont identiques.
 */

import { REST, Routes } from "discord.js";
import { ErreurConfiguration, lireConfiguration } from "./config.js";
import { journal } from "./logger.js";
import { COMMANDES } from "./commandes/index.js";

async function principal() {
  const configuration = lireConfiguration();
  const corps = COMMANDES.map((commande) => commande.donnees.toJSON());

  // Le client réessaie tout seul après une limite de débit ; on écoute ce
  // qu'il fait pour que l'attente soit visible au lieu de ressembler à un blocage.
  const rest = new REST({ version: "10", timeout: 120_000, retries: 5 }).setToken(configuration.token);
  rest.on("rateLimited", (information) => {
    const attente = Number(information.timeToReset ?? 0);
    journal.warn(
      `Discord limite les enregistrements de commandes : nouvelle tentative dans ${Math.ceil(attente / 1000)} s` +
        `${information.global ? " (limite globale)" : ""}.`,
    );
  });

  /** Écrit la liste à une portée donnée, et relit ce que Discord en a gardé. */
  async function enregistrer(chemin, libelle) {
    journal.info(`Envoi de ${corps.length} commandes vers ${libelle}...`);
    const resultat = await rest.put(chemin, { body: corps });
    journal.info(`Commandes enregistrées : ${resultat.length}.`);

    // Contrôle immédiat : ce que Discord détient réellement, pas ce qu'on croit
    // avoir envoyé.
    const enLigne = await rest.get(chemin);
    journal.info(`Vérification : ${enLigne.length} commande(s) côté Discord.`);
    return enLigne.length;
  }

  /**
   * Efface une portée, sans jamais faire échouer le déploiement.
   *
   * Une écriture vide ne coûte aucune création du quota du jour. Un refus est
   * signalé et n'arrête rien : la portée visée vient d'être écrite, le bot a de
   * quoi répondre.
   */
  async function effacer(chemin, libelle) {
    try {
      await rest.put(chemin, { body: [] });
      journal.info(`Anciennes commandes effacées (${libelle}).`);
    } catch (erreur) {
      journal.warn(`Effacement impossible (${libelle}) : ${erreur.message}`);
    }
  }

  /**
   * Signature d'une commande, réduite à ce que ce dépôt définit.
   *
   * Discord ajoute beaucoup de choses à ce qu'il rend (`id`, `version`,
   * `contexts`, `integration_types`…) et réordonne les clés : comparer les
   * objets bruts ne dirait jamais « rien n'a changé ». On ne garde donc que ce
   * que le bot écrit — nom, description, options, choix.
   */
  function signature(commande) {
    const options = (liste) =>
      (liste ?? []).map((option) => ({
        nom: option.name,
        description: option.description ?? "",
        type: option.type,
        requis: Boolean(option.required),
        choix: (option.choices ?? []).map((choix) => choix.name),
        options: options(option.options),
      }));

    return JSON.stringify({
      nom: commande.name,
      description: commande.description ?? "",
      options: options(commande.options),
    });
  }

  /**
   * Les commandes publiées à cette portée sont-elles déjà exactement les nôtres ?
   *
   * C'est ce qui évite le piège du quota : Discord n'autorise que 200 créations
   * par jour et par application, et chaque réécriture à l'identique en consomme
   * autant qu'il y a de commandes. Relancer `npm run commandes` pour rien ne
   * doit donc rien coûter.
   */
  async function dejaEnPlace(chemin) {
    const enLigne = await rest.get(chemin).catch(() => null);
    if (!Array.isArray(enLigne) || enLigne.length !== corps.length) return false;

    const cote = enLigne.map(signature).sort();
    const voulu = corps.map(signature).sort();
    return cote.every((valeur, index) => valeur === voulu[index]);
  }

  /** Écrit à une portée, en s'abstenant si elle est déjà à jour. */
  async function publier(chemin, libelle) {
    if (await dejaEnPlace(chemin)) {
      journal.info(`${libelle} : déjà à jour, aucune écriture (quota de créations préservé).`);
      return;
    }
    await enregistrer(chemin, libelle);
  }

  /** Portée réellement écrite : elle décide de celle qu'il faut effacer. */
  let portee = "global";

  if (configuration.guildId) {
    portee = "serveur";
    try {
      await publier(
        Routes.applicationGuildCommands(configuration.clientId, configuration.guildId),
        `le serveur ${configuration.guildId}`,
      );
    } catch (erreur) {
      // Discord refuse d'écrire dans un serveur quand sa limite de créations
      // du jour est atteinte. Publier au niveau **global** reste possible, et
      // c'est mieux que de laisser le bot sans aucune commande : il faut
      // simplement savoir que la propagation prend jusqu'à une heure.
      if (erreur.status !== 429) throw erreur;
      journal.warn("Discord refuse l'écriture dans ce serveur (limite de créations du jour atteinte).");
      portee = "global";

      // Si les commandes globales déjà publiées sont les mêmes, on ne les
      // réécrit pas : ce serait dépenser 84 créations pour rien, alors que le
      // quota est précisément ce qui vient de manquer.
      if (await dejaEnPlace(Routes.applicationCommands(configuration.clientId))) {
        journal.info(`Les ${corps.length} commandes globales déjà publiées sont identiques : rien n'a été réécrit.`);
      } else {
        journal.warn("Publication globale de secours...");
        await enregistrer(
          Routes.applicationCommands(configuration.clientId),
          "tous les serveurs (portée globale)",
        );
        journal.warn(
          "Commandes publiées globalement : Discord peut mettre jusqu'à une heure à les propager, et elles resteront visibles même si le bot rejoint un autre serveur.",
        );
      }
    }
  } else {
    await publier(Routes.applicationCommands(configuration.clientId), "tous les serveurs (portée globale)");
  }

  // Seulement maintenant : on retire les commandes de l'autre portée, qui
  // feraient doublon sous le même nom.
  if (portee === "serveur") {
    await effacer(Routes.applicationCommands(configuration.clientId), "portée globale");
    return;
  }

  if (configuration.guildId) {
    await effacer(
      Routes.applicationGuildCommands(configuration.clientId, configuration.guildId),
      `le serveur ${configuration.guildId}`,
    );
    return;
  }

  const serveurs = await rest.get(Routes.userGuilds()).catch(() => []);
  for (const serveur of serveurs) {
    await effacer(Routes.applicationGuildCommands(configuration.clientId, serveur.id), `le serveur ${serveur.id}`);
  }
}

principal().catch((erreurRecue) => {
  if (erreurRecue instanceof ErreurConfiguration) {
    console.error(`\n[DelphinaBot V2] ${erreurRecue.message}\n`);
  } else {
    console.error("[DelphinaBot V2] Déploiement impossible :", erreurRecue);
  }
  process.exit(1);
});
