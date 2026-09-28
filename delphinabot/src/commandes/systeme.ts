/**
 * Commandes système : aide, état du bot, journal, synchronisation du wiki.
 *
 * `/aide` est la seule commande que tout le monde devrait connaître. Elle
 * est lue dans la liste réelle des commandes enregistrées : ajouter une
 * commande sans l'ajouter à l'aide est impossible, et l'aide ne peut pas
 * devenir fausse.
 */

import { EmbedBuilder, version as versionDiscord } from "discord.js";
import type { Commande } from "../core/types.js";
import {
  LIBELLES_CATEGORIE,
  LIBELLES_NIVEAU,
  type Categorie,
} from "../core/types.js";
import { commande, confirmation, executer, repondre } from "./outils.js";
import { champs, or, succes } from "../lib/embres.js";
import { horodatage } from "../lib/duree.js";
import { lireJournal } from "../db/journal.js";
import { identifiantsPourSlug, lireLien } from "../db/liens.js";
import { pousser, type LienWiki } from "../modules/wiki/synchronisation.js";
import { journal } from "../logger.js";

/** Durée depuis le démarrage du processus, en français. */
function depuisDemarrage(): string {
  const secondes = Math.round(process.uptime());
  const jours = Math.floor(secondes / 86_400);
  const heures = Math.floor((secondes % 86_400) / 3600);
  const minutes = Math.floor((secondes % 3600) / 60);
  return [jours ? `${jours} j` : "", heures ? `${heures} h` : "", minutes ? `${minutes} min` : ""]
    .filter(Boolean)
    .join(" ") || "moins d'une minute";
}

const cmdAide: Commande = {
  nom: "aide",
  categorie: "systeme",
  niveau: "membre",
  usage: "/aide [commande]",
  resume: "Liste les commandes, par module, et explique l'une d'elles.",
  donnees: commande("aide", "Liste les commandes disponibles.").addStringOption((option) =>
    option.setName("commande").setDescription("Nom de la commande à expliquer.").setAutocomplete(true),
  ),
  async autocompletion(interaction, reglages, bot) {
    void reglages;
    const saisie = interaction.options.getFocused().toLowerCase();
    await interaction.respond(
      bot
        .listeCommandes()
        .filter((element) => element.nom.includes(saisie))
        .slice(0, 25)
        .map((element) => ({ name: `/${element.nom}`, value: element.nom })),
    );
  },
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const cible = interaction.options.getString("commande");

      if (cible) {
        const element = bot.commandes.get(cible);
        if (!element) {
          return repondre(interaction, or(`La commande \`${cible}\` n'existe pas.`));
        }
        await repondre(
          interaction,
          or(
            [
              `**${element.resume}**`,
              "",
              `**Usage** : \`${element.usage}\``,
              `**Module** : ${LIBELLES_CATEGORIE[element.categorie]}`,
              `**Accès** : ${LIBELLES_NIVEAU[element.niveau]}`,
            ].join("\n"),
            `/${element.nom}`,
          ),
        );
        return;
      }

      const categories = new Map<Categorie, Commande[]>();
      for (const element of bot.listeCommandes()) {
        const liste = categories.get(element.categorie) ?? [];
        liste.push(element);
        categories.set(element.categorie, liste);
      }

      const embed = new EmbedBuilder()
        .setColor(0xd4a63a)
        .setTitle("DelphinaBot — aide")
        .setDescription(
          "Bot du IIIe Delphinat de Gratianopolis : sécurité, modération, anti-raid, divertissement, économie et musique.",
        );

      for (const [categorie, elements] of categories) {
        embed.addFields(
          champs([
            [
              LIBELLES_CATEGORIE[categorie],
              elements.map((element) => `\`/${element.nom}\` — ${element.resume}`).join("\n"),
            ],
          ]),
        );
      }

      embed.setFooter({
        text: `Toutes les commandes sauf mention contraire /aide commande`,
      });
      await repondre(interaction, embed);
    });
  },
};

const cmdStatistiques: Commande = {
  nom: "statistiques",
  categorie: "systeme",
  niveau: "membre",
  usage: "/statistiques",
  resume: "Affiche l'état technique du bot.",
  donnees: commande("statistiques", "État technique du bot."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const memoire = process.memoryUsage().heapUsed / 1024 / 1024;
      await repondre(
        interaction,
        or(
          [
            `**Serveurs** : ${bot.guilds.cache.size}`,
            `**Commandes** : ${bot.commandes.size}`,
            `**En ligne depuis** : ${depuisDemarrage()}`,
            `**Mémoire** : ${memoire.toFixed(1)} Mo`,
            `**discord.js** : v${versionDiscord}`,
            `**Latence** : ${Math.round(bot.ws.ping)} ms`,
          ].join("\n"),
          "DelphinaBot en un coup d'œil",
        ),
      );
    });
  },
};

const cmdPing: Commande = {
  nom: "ping",
  categorie: "systeme",
  niveau: "membre",
  usage: "/ping",
  resume: "Mesure la latence du bot vers Discord.",
  donnees: commande("ping", "Latence du bot."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const debut = Date.now();
      await interaction.deferReply({ ephemeral: true });
      const aller = Date.now();
      await interaction.editReply({ content: "…" });
      const retour = Date.now();

      await repondre(
        interaction,
        or(
          [
            `**Latence** : ${Math.round(bot.ws.ping)} ms`,
            `**Aller-retour de l'interaction** : ${retour - debut} ms`,
            `**Traversée du réseau** : ${retour - aller} ms`,
          ].join("\n"),
        ),
      );
    });
  },
};

const cmdJournal: Commande = {
  nom: "journal",
  categorie: "systeme",
  niveau: "admin",
  usage: "/journal",
  resume: "Affiche les derniers événements du serveur.",
  donnees: commande("journal", "Derniers événements enregistrés."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const entrees = await lireJournal(guild.id, 15);

      if (entrees.length === 0) {
        return confirmation({ bot, interaction, serveur }, "Aucun événement enregistré pour l'instant.");
      }

      const embed = new EmbedBuilder()
        .setColor(0x3b6ea5)
        .setTitle("Journal du serveur")
        .setDescription(
          entrees
            .map((entree) => {
              const qui = entree.utilisateurId ? `<@${entree.utilisateurId}>` : "système";
              const cible = entree.cibleId ? ` → <@${entree.cibleId}>` : "";
              return `• \`${entree.type}\` ${qui}${cible} — ${horodatage(entree.creeLe)}`;
            })
            .join("\n"),
        );
      await repondre(interaction, embed);
    });
  },
};

const cmdSynchroniser: Commande = {
  nom: "synchroniser",
  categorie: "systeme",
  niveau: "admin",
  usage: "/synchroniser [page] [membre]",
  resume: "Pousse vers le wiki les rôles vérifiés et un rattachement précis.",
  donnees: commande("synchroniser", "Signale des rattachements au wiki.")
    .addStringOption((option) =>
      option.setName("page").setDescription("Page du wiki concernée (par défaut : tous les liens vérifiés)."),
    )
    .addUserOption((option) =>
      option.setName("membre").setDescription("Membre à signaler précisément."),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const { wikiUrl, secretSync } = bot.configuration;
      if (!secretSync) {
        return repondre(
          interaction,
          or("BOT_SYNC_SECRET n'est pas configuré : la synchronisation est désactivée sur ce bot."),
        );
      }

      const page = interaction.options.getString("page");
      const membre = interaction.options.getUser("membre");

      let liens: LienWiki[];
      if (membre) {
        const lien = await lireLien(membre.id);
        const pageLiee = page ?? lien?.slug;
        if (!pageLiee) {
          return repondre(
            interaction,
            or("Ce membre n'a aucun lien de rôle vérifié. Demandez-lui `/lien <page>`."),
          );
        }
        liens = [{ slug: pageLiee, discordUserId: membre.id }];
      } else if (page) {
        const identifiants = await identifiantsPourSlug(page);
        liens = identifiants.map((discordUserId) => ({ slug: page, discordUserId }));
      } else {
        return repondre(
          interaction,
          or("Précisez une page, un membre, ou les deux : `/synchroniser page:eitam`."),
        );
      }

      await interaction.deferReply({ ephemeral: true });
      const resultat = await pousser(wikiUrl, secretSync, liens, interaction.user.id);
      journal.info(`Synchronisation wiki : ${liens.length} lien(s), ${resultat.raison ?? "accepté"}.`);

      await repondre(
        interaction,
        (resultat.envoye ? succes : or)(
          resultat.envoye
            ? `Wiki notifié de ${liens.length} rattachement(s).`
            : `Synchronisation impossible : ${resultat.raison}`,
        ),
      );
    });
  },
};

export const COMMANDES_SYSTEME: Commande[] = [
  cmdAide,
  cmdStatistiques,
  cmdPing,
  cmdJournal,
  cmdSynchroniser,
];
