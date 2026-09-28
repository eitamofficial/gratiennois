/**
 * Commandes de divertissement.
 *
 * Elles ne touchent pas au fonctionnement du serveur : ni sanction, ni
 * économie, ni permission. C'est ce qui leur permet d'être illustratives —
 * un quiz, un décret imaginaire, un jet de dés.
 *
 * Toutes les réponses viennent de fichiers JSON versionnés
 * (`delphinabot/ressources/`), jamais d'un appel réseau : un bot qui dépend
 * d'une clé externe pour proposer un jeu de mots n'est pas un bot, c'est une
 * facture.
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import type { Commande } from "../core/types.js";
import { commande, executer, repondre } from "./outils.js";
import { champs, or, succes } from "../lib/embres.js";
import { ressource } from "../lib/ressources.js";
import { choisir, entier, melanger } from "../lib/texte.js";
import { baliseTemps } from "../lib/duree.js";
import { classement, lireMembre, xpPourNiveau } from "../db/membres.js";

interface QuestionQuiz {
  question: string;
  reponses: string[];
  reponse: number;
}

interface PartieEnCours {
  /** Index de la question tirée. */
  question: number;
  /** Indices des propositions dans l'ordre d'affichage. */
  ordre: number[];
  /** Bonne proposition, exprimée dans l'ordre d'affichage. */
  position: number;
  expire: number;
}

/**
 * Partie de quiz en cours, par serveur.
 *
 * Une seule question à la fois, et une minute pour y répondre. En mémoire :
 * une partie interrompue par un redémarrage n'a aucune valeur à préserver.
 */
const partiesEnCours = new Map<string, PartieEnCours>();

const LETTRES = ["A", "B", "C", "D", "E"];
const DUREE_PARTIE = 60_000;

const cmdQuiz: Commande = {
  nom: "quiz",
  categorie: "fun",
  niveau: "membre",
  usage: "/quiz",
  resume: "Pose une question à choix multiples (une minute pour répondre).",
  donnees: commande("quiz", "Pose une question à choix multiples."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { questions } = ressource<{ questions: QuestionQuiz[] }>("quiz");
      const index = entier(0, questions.length - 1);
      const question = questions[index];
      if (!question) {
        return repondre(interaction, or("Le quiz est vide pour le moment."));
      }

      // Les propositions sont mélangées à chaque partie : la bonne réponse ne
      // reste pas à la première place, et le quiz ne devient pas une
      // mémorisation de l'ordre.
      const ordre = melanger(question.reponses.map((_, position) => position));
      const position = ordre.indexOf(question.reponse);

      partiesEnCours.set(interaction.guildId ?? "dm", {
        question: index,
        ordre,
        position,
        expire: Date.now() + DUREE_PARTIE,
      });

      const embed = new EmbedBuilder()
        .setColor(0xd4a63a)
        .setTitle("Quiz du Delphinat")
        .setDescription(
          [
            question.question,
            "",
            ...ordre.map((proposition, rang) => `**${LETTRES[rang]}.** ${question.reponses[proposition]}`),
          ].join("\n"),
        )
        .setFooter({ text: "Répondez avec /reponse A, B, C ou D — une minute" });

      await repondre(interaction, embed, true);
    });
  },
};

const cmdReponse: Commande = {
  nom: "reponse",
  categorie: "fun",
  niveau: "membre",
  usage: "/reponse <A|B|C|D>",
  resume: "Répond à la question du quiz en cours.",
  donnees: commande("reponse", "Répond à la question du quiz en cours.").addStringOption((option) =>
    option
      .setName("lettre")
      .setDescription("Lettre de la proposition choisie.")
      .setRequired(true)
      .addChoices(
        { name: "A", value: "A" },
        { name: "B", value: "B" },
        { name: "C", value: "C" },
        { name: "D", value: "D" },
      ),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const cle = interaction.guildId ?? "dm";
      const partie = partiesEnCours.get(cle);
      if (!partie) {
        return repondre(
          interaction,
          or("Aucune question en cours. Lancez `/quiz` pour en poser une."),
        );
      }
      if (partie.expire < Date.now()) {
        partiesEnCours.delete(cle);
        return repondre(interaction, or("La question a expiré. Relancez `/quiz`."));
      }

      const { questions } = ressource<{ questions: QuestionQuiz[] }>("quiz");
      const question = questions[partie.question];
      if (!question) {
        partiesEnCours.delete(cle);
        return repondre(interaction, or("La question en cours n'existe plus."));
      }

      const choisie = LETTRES.indexOf(interaction.options.getString("lettre", true));
      if (choisie < 0) {
        return repondre(interaction, or("Choisissez une proposition entre A et D."));
      }

      // Une seule réponse par partie : la supprimer empêche de voter trois fois
      // pour trouver la bonne.
      partiesEnCours.delete(cle);
      const bonne = choisie === partie.position;

      await repondre(
        interaction,
        (bonne ? succes : or)(
          [
            bonne ? "Bonne réponse." : "Réponse incorrecte.",
            `La bonne proposition était **${LETTRES[partie.position]}. ${question.reponses[question.reponse]}**.`,
            "Relancez `/quiz` pour une nouvelle question.",
          ].join("\n"),
          bonne ? "Quiz — juste" : "Quiz — raté",
        ),
        true,
      );
    });
  },
};

const cmdDe: Commande = {
  nom: "de",
  categorie: "fun",
  niveau: "membre",
  usage: "/de <notation> [nombre]",
  resume: "Lance des dés, en notation de jeu de rôle (2d6+3).",
  donnees: commande("de", "Lance des dés.")
    .addStringOption((option) =>
      option
        .setName("notation")
        .setDescription("Notation, par exemple 2d6+3 ou d20.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de jets à faire (1 à 20).")
        .setMinValue(1)
        .setMaxValue(20),
    ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const notation = interaction.options
        .getString("notation", true)
        .toLowerCase()
        .replace(/\s+/g, "");
      const correspondance = /^(\d{1,2})?d(\d{1,3})([+-]\d{1,4})?$/.exec(notation);
      if (!correspondance) {
        return repondre(interaction, or("Notation illisible. Exemples : `d20`, `2d6`, `1d100+5`."));
      }

      const nombre = Number(correspondance[1] ?? 1);
      const faces = Number(correspondance[2]);
      const bonus = correspondance[3] ? Number(correspondance[3]) : 0;

      if (faces < 2 || faces > 1000) {
        return repondre(interaction, or("Le nombre de faces doit être compris entre 2 et 1000."));
      }
      if (nombre * faces > 1000) {
        return repondre(interaction, or("Trop de dés à lancer d'un coup (1000 faces au maximum)."));
      }

      const jets = interaction.options.getInteger("nombre") ?? 1;
      const resultats: number[] = [];
      for (let i = 0; i < jets; i += 1) {
        let total = bonus;
        for (let d = 0; d < nombre; d += 1) total += entier(1, faces);
        resultats.push(total);
      }

      const totalGeneral = resultats.reduce((somme, valeur) => somme + valeur, 0);
      const detail =
        nombre * jets <= 12
          ? `\nDétail : ${resultats.join(" + ")}${bonus >= 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`} = **${totalGeneral}**`
          : "";

      await repondre(
        interaction,
        or(
          `**${notation}** — ${jets > 1 ? `${jets} jets` : "un jet"} : ${resultats.join(", ")}${detail}`,
          "Jet de dés",
        ),
      );
    });
  },
};

const cmdChoisir: Commande = {
  nom: "choisir",
  categorie: "fun",
  niveau: "membre",
  usage: "/choisir <a | b | c>",
  resume: "Tire au sort parmi plusieurs options séparées par une barre verticale.",
  donnees: commande("choisir", "Tire au sort parmi plusieurs options.").addStringOption((option) =>
    option
      .setName("options")
      .setDescription("Options séparées par une barre verticale : un | deux | trois.")
      .setRequired(true),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const options = interaction.options
        .getString("options", true)
        .split("|")
        .map((element) => element.trim())
        .filter(Boolean);

      if (options.length < 2) {
        return repondre(
          interaction,
          or("Il faut au moins deux options, séparées par une barre verticale : `un | deux`."),
        );
      }

      await repondre(interaction, or(`Le hasard a tranché : **${choisir(options)}** 🎲`));
    });
  },
};

const cmdCitation: Commande = {
  nom: "citation",
  categorie: "fun",
  niveau: "membre",
  usage: "/citation",
  resume: "Tire une citation du Delphinat.",
  donnees: commande("citation", "Tire une citation du Delphinat."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const { citations } = ressource<{ citations: string[] }>("citations");
      const texte = choisir(citations);
      if (!texte) return repondre(interaction, or("Aucune citation enregistrée."));
      await repondre(interaction, or(`« ${texte} »`, "Citation"));
    });
  },
};

const cmdDecret: Commande = {
  nom: "decret",
  categorie: "fun",
  niveau: "membre",
  usage: "/decret",
  resume: "Invente un décret absurde, mais correctement rédigé.",
  donnees: commande("decret", "Invente un décret du IIIe Delphinat."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const donnees = ressource<{
        modeles: string[];
        interdits: string[];
        peines: string[];
        objets: string[];
      }>("decrets");

      const texte = (choisir(donnees.modeles) ?? "Article {numero} : {interdit} est désormais obligatoire.")
        .replace("{numero}", String(entier(1, 999)))
        .replace("{date}", baliseTemps(Date.now()))
        .replace("{interdit}", choisir(donnees.interdits) ?? "divers")
        .replace("{peine}", choisir(donnees.peines) ?? "une sanction")
        .replace("{objet}", choisir(donnees.objets) ?? "un registre");

      await repondre(interaction, or(texte, "Décret du IIIe Delphinat"));
    });
  },
};

const cmdNiveau: Commande = {
  nom: "niveau",
  categorie: "fun",
  niveau: "membre",
  usage: "/niveau [membre]",
  resume: "Affiche la progression par niveau d'un membre.",
  donnees: commande("niveau", "Progression d'un membre.").addUserOption((option) =>
    option.setName("membre").setDescription("Membre concerné (vous-même par défaut)."),
  ),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const vise = interaction.options.getUser("membre") ?? interaction.user;
      const fiche = await lireMembre(guild.id, vise.id);

      const seuilActuel = xpPourNiveau(fiche.niveau);
      const seuilSuivant = xpPourNiveau(fiche.niveau + 1);
      const progression =
        seuilSuivant === seuilActuel
          ? 100
          : Math.floor(((fiche.xpTotal - seuilActuel) / (seuilSuivant - seuilActuel)) * 100);
      const pourcentage = Math.max(0, Math.min(100, progression));

      const embed = new EmbedBuilder()
        .setColor(0xd4a63a)
        .setTitle(`Niveau de ${vise.username}`)
        .setFields(
          champs([
            ["Niveau", String(fiche.niveau)],
            ["Expérience", `${Math.floor(fiche.xpTotal)} point(s)`],
            ["Messages", String(fiche.messages)],
            ["Ducats", `${fiche.ducats} 🪙`],
            ["Progression", `${barre(pourcentage)} ${pourcentage} %`],
          ]),
        );

      await repondre(interaction, embed);
    });
  },
};

const cmdClassement: Commande = {
  nom: "classement",
  categorie: "fun",
  niveau: "membre",
  usage: "/classement",
  resume: "Classement des membres par expérience.",
  donnees: commande("classement", "Classement par expérience."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      const guild = interaction.guild;
      if (!guild) return;
      const entrees = await classement(guild.id, "xp_total", 10);
      if (entrees.length === 0) {
        return repondre(interaction, or("Le classement est encore vide."));
      }

      const lignes = await Promise.all(
        entrees.map(async (entree, index) => {
          const membre = await guild.members.fetch(entree.utilisateurId).catch(() => null);
          const nom = membre?.displayName ?? `Membre ${entree.utilisateurId}`;
          return `${index + 1}. **${nom}** — niveau ${entree.niveau} (${Math.floor(entree.valeur)} XP)`;
        }),
      );

      await repondre(interaction, or(lignes.join("\n"), "Classement"));
    });
  },
};

const cmdPiece: Commande = {
  nom: "pile-ou-face",
  categorie: "fun",
  niveau: "membre",
  usage: "/pile-ou-face",
  resume: "Lance une pièce.",
  donnees: commande("pile-ou-face", "Lance une pièce."),
  async executer({ bot, interaction, serveur }) {
    await executer({ bot, interaction, serveur }, async () => {
      await repondre(interaction, or(jetDePiece(), "Pile ou face"));
    });
  },
};

/** Relance de la pièce, via le bouton posé par `/pile-ou-face`. */
export function relancerPiece(): EmbedBuilder {
  return or(jetDePiece(), "Pile ou face");
}

function jetDePiece(): string {
  return `La pièce est tombée sur **${entier(0, 1) === 0 ? "pile" : "face"}**. 🪙`;
}

/** Ligne de boutons du pile-ou-face. */
export function boutonsPiece(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("delphi:piece")
      .setLabel("Relancer")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🪙"),
  );
}

/** Barre de progression en caractères, lisible partout. */
function barre(pourcentage: number): string {
  const cases = 12;
  const pleines = Math.round((pourcentage / 100) * cases);
  return `${"█".repeat(pleines)}${"░".repeat(Math.max(0, cases - pleines))}`;
}

export const COMMANDES_FUN: Commande[] = [
  cmdQuiz,
  cmdReponse,
  cmdDe,
  cmdChoisir,
  cmdCitation,
  cmdDecret,
  cmdNiveau,
  cmdClassement,
  cmdPiece,
];
