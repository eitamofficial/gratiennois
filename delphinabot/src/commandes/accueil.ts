/**
 * Commandes d'accueil.
 *
 * `/simuler` montre les messages que le bot envoie vraiment à l'arrivée et au
 * départ. C'est la seule façon de relire un embed d'accueil sans faire
 * arriver un membre pour de vrai, ou partir soi-même pour éprouver un message
 * de départ.
 *
 * Les embeds viennent de `modules/accueil.ts`, le module qu'alimentent aussi
 * les événements. Un aperçu réécrit ici dériverait du message réel — et c'est
 * précisément ce qu'on relit.
 */

import { PermissionFlagsBits } from "discord.js";
import type { Commande } from "../core/types.js";
import { commande, executer, repondre } from "./outils.js";
import {
  embedBienvenue,
  embedDepart,
  embedEtapes,
  type ContexteMembre,
} from "../modules/accueil.js";
import { succes } from "../lib/embres.js";

/**
 * Membre de démonstration.
 *
 * Les valeurs sont réalistes mais inventées : une simulation qui afficherait
 * le vrai nom d'un membre présent donnerait l'illusion d'un message réel.
 */
function membreDeDemonstration(wiki: string): ContexteMembre {
  return {
    pseudo: "nouveau_arrivant",
    identifiant: "000000000000000000",
    nomServeur: "IIIe Delphinat de Gratianopolis",
    ageCompteJours: 12,
    roles: ["🌟|Citoyen Gratiennois"],
    wiki,
    constitution: `${wiki}/constitution`,
  };
}

const cmdSimuler: Commande = {
  nom: "simuler",
  categorie: "systeme",
  niveau: "admin",
  usage: "/simuler <accueil|depart|quarantaine>",
  resume: "Prévisualise le message d'accueil ou d'au revoir, sans déplacer personne.",
  donnees: commande("simuler", "Prévisualise les messages d'accueil et de départ.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Le message à prévisualiser.")
        .setRequired(true)
        .addChoices(
          { name: "Accueil — un membre arrive", value: "accueil" },
          { name: "Départ — un membre part", value: "depart" },
          { name: "Accueil en quarantaine — serveur verrouillé", value: "quarantaine" },
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;

      const wiki = bot.configuration.wikiUrl.replace(/\/+$/, "");
      const choix = interaction.options.getString("message", true);
      const membre = membreDeDemonstration(wiki);

      const embed =
        choix === "depart" ? embedDepart(membre, 43) : embedBienvenue(membre, choix === "quarantaine");

      await repondre(
        interaction,
        succes(
          [
            "**Simulation** — ce message n'a été envoyé à personne.",
            "Il vient du même module que le message réel : ce que vous voyez est exactement ce qu'un membre recevra.",
            "",
            `Salon d'accueil configuré : ${
              serveur.salonBienvenue ? `<#${serveur.salonBienvenue}>` : "**aucun**"
            }`,
          ].join("\n"),
          "Aperçu",
        ),
      );

      // Envoyé dans le salon d'accueil s'il existe, sinon dans le canal où la
      // commande a été tapée : une simulation qui atterrit ailleurs serait
      // impossible à rattacher à ce qu'elle montre.
      const cible = serveur.salonBienvenue
        ? guild.channels.cache.get(serveur.salonBienvenue)
        : interaction.channel;

      if (cible && "send" in cible) {
        await cible.send({ embeds: [embed] }).catch(() => undefined);
        return;
      }
      await interaction.followUp({ embeds: [embed] });
    });
  },
};

const cmdBienvenue: Commande = {
  nom: "bienvenue",
  categorie: "systeme",
  niveau: "membre",
  usage: "/bienvenue",
  resume: "Les quatre étapes pour devenir membre du Delphinat.",
  donnees: commande("bienvenue", "Comment devenir membre du IIIe Delphinat."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const wiki = bot.configuration.wikiUrl.replace(/\/+$/, "");
      await interaction.reply({ embeds: [embedEtapes(wiki, `${wiki}/constitution`)] });
    });
  },
};

export const COMMANDES_ACCUEIL: Commande[] = [cmdSimuler, cmdBienvenue];
