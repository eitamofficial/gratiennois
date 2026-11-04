/**
 * Divertissement.
 *
 * Rien ici ne modifie le serveur : ces commandes servent à faire vivre le
 * salon. Deux d'entre elles s'appuient sur les ressources éditoriales du
 * Delphinat (`ressources/*.json`) — citations et décrets — que l'on peut
 * réécrire sans toucher au code.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { or, succes } from "../lib/embres.js";
import { ErreurUtilisateur } from "./erreurs.js";
import { choisir, entier, remplir } from "../lib/texte.js";
import { citation, decret, optionsQuiz, questionQuiz } from "../lib/ressources.js";

const cmdDe = {
  nom: "de",
  categorie: "fun",
  resume: "Lance un ou plusieurs dés.",
  donnees: new SlashCommandBuilder()
    .setName("de")
    .setDescription("Lance des dés.")
    .addIntegerOption((option) =>
      option.setName("faces").setDescription("Nombre de faces (6 par défaut)").setMinValue(2).setMaxValue(1000),
    )
    .addIntegerOption((option) =>
      option.setName("nombre").setDescription("Nombre de dés (1 par défaut)").setMinValue(1).setMaxValue(20),
    ),
  async executer(interaction) {
    const faces = interaction.options.getInteger("faces") ?? 6;
    const nombre = interaction.options.getInteger("nombre") ?? 1;

    const tirages = Array.from({ length: nombre }, () => entier(1, faces));
    const total = tirages.reduce((somme, valeur) => somme + valeur, 0);

    await interaction.reply({
      embeds: [
        or(
          nombre === 1
            ? `🎲 **${tirages[0]}**`
            : `${nombre}d${faces} → ${tirages.map((valeur) => `\`${valeur}\``).join(" + ")}\n**Total : ${total}**`,
          nombre === 1 ? `Dé à ${faces} faces` : `Lancer de ${nombre} dés`,
        ),
      ],
    });
  },
};

const cmdPileOuFace = {
  nom: "pile-ou-face",
  categorie: "fun",
  resume: "Tire à pile ou face.",
  donnees: new SlashCommandBuilder().setName("pile-ou-face").setDescription("Tire à pile ou face."),
  async executer(interaction) {
    const face = choisir(["Pile", "Face"]);
    await interaction.reply({ embeds: [or(`🪙 **${face} !**`, "Tirage")] });
  },
};

const cmdChoisir = {
  nom: "choisir",
  categorie: "fun",
  resume: "Départage plusieurs propositions.",
  detail: "Les propositions se séparent par des barres verticales : `pizza | pâtes | salade`. Sans proposition, un simple oui ou non est tiré.",
  donnees: new SlashCommandBuilder()
    .setName("choisir")
    .setDescription("Choisit au hasard parmi des propositions.")
    .addStringOption((option) =>
      option
        .setName("propositions")
        .setDescription("Propositions séparées par des barres verticales |")
        .setMaxLength(900),
    ),
  async executer(interaction) {
    const propositions = (interaction.options.getString("propositions") ?? "")
      .split("|")
      .map((element) => element.trim())
      .filter(Boolean);

    if (propositions.length === 0) {
      const reponse = choisir(["Oui", "Non", "Peut-être"]);
      await interaction.reply({ embeds: [or(`🎱 **${reponse}.**`, "Le sort en a décidé")] });
      return;
    }

    const choix = choisir(propositions);
    await interaction.reply({
      embeds: [
        or(
          `Parmi ${propositions.length} propositions, le sort retient :\n\n**${choix}**`,
          "Décision tirée au sort",
        ),
      ],
    });
  },
};

/**
 * Dernière question de quiz posée, par salon : c'est ce qui permet à
 * `/reponse` de donner la solution sans la redemander.
 */
export const dernierQuiz = new Map();

const cmdReponse = {
  nom: "reponse",
  categorie: "fun",
  resume: "Donne la réponse de la dernière question de quiz.",
  donnees: new SlashCommandBuilder()
    .setName("reponse")
    .setDescription("Donne la réponse de la dernière question de quiz posée ici."),
  async executer(interaction) {
    const question = dernierQuiz.get(interaction.channelId);
    if (!question) throw new ErreurUtilisateur("Aucune question de quiz n'a été posée dans ce salon.");

    await interaction.reply({
      embeds: [succes(`**${question.question}**\n\nRéponse : **${question.bonne}**`, "Réponse")],
    });
  },
};

const cmdCitation = {
  nom: "citation",
  categorie: "fun",
  resume: "Affiche une citation du Delphinat.",
  donnees: new SlashCommandBuilder().setName("citation").setDescription("Affiche une citation du Delphinat."),
  async executer(interaction, contexte) {
    const texte = citation(contexte.configuration.chemins.ressources);
    if (!texte) throw new ErreurUtilisateur("Le fichier `ressources/citations.json` est vide ou introuvable.");
    await interaction.reply({ embeds: [or(`> ${texte}\n\n— *Sagesse gratiennoise*`, "Citation")] });
  },
};

const cmdDecret = {
  nom: "decret",
  categorie: "fun",
  resume: "Fait publier un décret absurde au bot.",
  donnees: new SlashCommandBuilder().setName("decret").setDescription("Publie un décret tiré au sort."),
  async executer(interaction, contexte) {
    const texte = decret(contexte.configuration.chemins.ressources);
    if (!texte) throw new ErreurUtilisateur("Le fichier `ressources/decrets.json` est vide ou introuvable.");
    await interaction.reply({
      embeds: [or(texte, "Décret du jour").setFooter({ text: "DelphinaBot · le Conseil décline toute responsabilité" })],
    });
  },
};

const cmdQuiz = {
  nom: "quiz",
  categorie: "fun",
  resume: "Pose une question de culture gratiennoise.",
  detail: "La première personne à cliquer sur la bonne réponse gagne. Trente secondes pour répondre.",
  donnees: new SlashCommandBuilder().setName("quiz").setDescription("Pose une question sur le Delphinat."),
  async executer(interaction, contexte) {
    const question = questionQuiz(contexte.configuration.chemins.ressources);
    if (!question) throw new ErreurUtilisateur("Le fichier `ressources/quiz.json` est vide ou introuvable.");

    const { bonne, proposees } = optionsQuiz(question);
    const lettres = ["A", "B", "C", "D"];

    // On retient la solution, pour que `/reponse` puisse la donner ensuite.
    dernierQuiz.set(interaction.channelId, { question: question.question, bonne });

    const boutons = proposees.slice(0, 4).map((reponse, index) =>
      new ButtonBuilder()
        .setCustomId(`quiz:${index}`)
        .setLabel(`${lettres[index]} — ${reponse}`.slice(0, 80))
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({
      embeds: [or(`${question.question}\n\n${proposees.slice(0, 4).map((r, i) => `**${lettres[i]}.** ${r}`).join("\n")}`, "Question de culture gratiennoise")],
      components: [new ActionRowBuilder().addComponents(boutons)],
    });

    const message = await interaction.fetchReply();
    const collecteur = message.createMessageComponentCollector({ time: 30_000 });

    collecteur.on("collect", async (bouton) => {
      const index = Number(bouton.customId.split(":")[1]);
      const juste = proposees[index] === question.reponses[question.reponse];

      await bouton.reply(
        juste
          ? {
              embeds: [succes(`<@${bouton.user.id}> a trouvé la bonne réponse : **${proposees[index]}**.`, "Bonne réponse")],
            }
          : {
              embeds: [or(`<@${bouton.user.id}> s'est trompé. Réessayez !`, "Mauvaise réponse")],
              flags: 64,
            },
      ).catch(() => {});

      if (juste) collecteur.stop("trouve");
    });

    collecteur.on("end", async (_collection, raison) => {
      if (raison === "trouve") {
        await message.edit({ components: [] }).catch(() => {});
        return;
      }
      await message
        .edit({
          embeds: [
            or(
              `${question.question}\n\n**Personne n'a trouvé.** La bonne réponse était : **${question.reponses[question.reponse]}**.`,
              "Temps écoulé",
            ),
          ],
          components: [],
        })
        .catch(() => {});
    });
  },
};

const cmdCalin = {
  nom: "calin",
  categorie: "fun",
  resume: "Envoie un câlin à un membre.",
  donnees: new SlashCommandBuilder()
    .setName("calin")
    .setDescription("Envoie un câlin à quelqu'un.")
    .addUserOption((option) => option.setName("membre").setDescription("La personne à câliner").setRequired(true)),
  async executer(interaction) {
    const cible = interaction.options.getUser("membre", true);
    const formes = [
      "serre {cible} très fort dans ses bras",
      "enveloppe {cible} dans un câlin réconfortant",
      "offre un câlin princier à {cible}",
      "se blottit contre {cible}",
    ];
    const phrase = remplir(choisir(formes), { cible: `<@${cible.id}>` });

    await interaction.reply({ embeds: [or(`🫂 <@${interaction.user.id}> ${phrase}.`, "Câlin")] });
  },
};

const cmdBisous = {
  nom: "bisous",
  categorie: "fun",
  resume: "Envoie un bisou à un membre.",
  donnees: new SlashCommandBuilder()
    .setName("bisous")
    .setDescription("Envoie un bisou à quelqu'un.")
    .addUserOption((option) => option.setName("membre").setDescription("La personne à embrasser").setRequired(true)),
  async executer(interaction) {
    const cible = interaction.options.getUser("membre", true);
    if (cible.id === interaction.user.id) {
      throw new ErreurUtilisateur("Un bisou à soi-même, c'est possible, mais ce n'est pas ici.");
    }
    const formes = [
      "dépose un bisou sur la joue de {cible}",
      "envoie un bisou volant à {cible}",
      "fait la bise à {cible}",
    ];
    const phrase = remplir(choisir(formes), { cible: `<@${cible.id}>` });
    await interaction.reply({ embeds: [or(`💋 <@${interaction.user.id}> ${phrase}.`, "Bisou")] });
  },
};

export const COMMANDES_FUN = [
  cmdDe,
  cmdPileOuFace,
  cmdChoisir,
  cmdReponse,
  cmdCitation,
  cmdDecret,
  cmdQuiz,
  cmdCalin,
  cmdBisous,
];
