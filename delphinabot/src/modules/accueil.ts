/**
 * Messages d'accueil et de départ.
 *
 * Ces deux messages vivent ici, et nulle part ailleurs, pour une raison
 * précise : la commande `/simuler` doit montrer *exactement* ce que le bot
 * envoie. Si l'aperçu était réécrit à côté, il dériverait du message réel —
 * et c'est précisément un message qu'on relit pour la forme, pas pour la
 * logique.
 *
 * Les deux messages sont donc construits par les mêmes fonctions, avec les
 * mêmes champs, dans le même ordre.
 */

import { EmbedBuilder } from "discord.js";
import { COULEURS } from "../lib/embres.js";

const PIED = "DelphinaBot · IIIe Delphinat de Gratianopolis";

/** Étapes qu'un nouveau membre suit, une fois arrivé. */
export const ETAPES: [string, string][] = [
  [
    "1. Lire le règlement",
    "Le règlement du Delphinat est public et court. C'est lui qui fait foi.",
  ],
  [
    "2. Rattacher son compte",
    "`/lien` rattache votre compte Discord à votre page du wiki. C'est ce qui vous identifie comme membre.",
  ],
  [
    "3. Présenter son expérience",
    "Une phrase sur ce que vous venez faire ici. Le wiki attend une notice.",
  ],
  [
    "4. Voter",
    "Les consultations se tiennent dans les salons dédiés. Le détail des scrutins est public.",
  ],
];

/** Ce qu'un message d'accueil doit savoir du membre. */
export interface ContexteMembre {
  pseudo: string;
  identifiant: string;
  nomServeur: string;
  ageCompteJours: number;
  roles: string[];
  wiki: string;
  constitution: string;
}

/**
 * Message d'accueil.
 *
 * `quarantaine` à `true` change le texte affiché : un membre arrivé pendant un
 * verrouillage ne doit pas lire la même chose qu'un membre normal, sinon le
 * bot annonce un accès libre qu'il ne donne pas.
 */
export function embedBienvenue(ctx: ContexteMembre, quarantaine: boolean): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(quarantaine ? COULEURS.alerte : COULEURS.reussite)
    .setAuthor({
      name: `Bienvenue, ${ctx.pseudo}`,
      iconURL: avatar(ctx.identifiant),
    })
    .setDescription(
      quarantaine
        ? [
            "Le serveur est **verrouillé** : votre accès sera validé par l'administration.",
            "Vos messages sont conservés jusqu'à la levée, ils ne sont pas perdus.",
          ].join("\n")
        : [
            `Vous êtes arrivé sur **${ctx.nomServeur}**.`,
            "Le règlement tient en quelques lignes, et il fait foi.",
          ].join("\n"),
    );

  embed.addFields(
    {
      name: "Votre compte",
      value: [
        `Créé il y a **${ctx.ageCompteJours} jour${ctx.ageCompteJours > 1 ? "s" : ""}**`,
        quarantaine ? "Statut : **en quarantaine**" : "Statut : **accueilli**",
      ].join("\n"),
      inline: true,
    },
    {
      name: "Vos rôles",
      value: ctx.roles.length > 0 ? ctx.roles.join("\n") : "Aucun pour l'instant",
      inline: true,
    },
  );

  if (!quarantaine) {
    embed.addFields({
      name: "Pour commencer",
      value: ETAPES.map(([titre]) => titre).join("\n"),
    });
  }

  embed.addFields({
    name: "À lire",
    value: [
      `[Constitution](${ctx.constitution}) — le texte fondateur`,
      `[Encyclopédie du wiki](${ctx.wiki}) — articles et institutions`,
    ].join("\n"),
  });

  return embed.setFooter({ text: PIED }).setTimestamp(new Date());
}

/**
 * Message d'au revoir.
 *
 * `dureeJours` vient de la date d'arrivée, pas de la date du compte : un
 * membre installé depuis un an et arrivé hier n'est pas un ancien du pays.
 */
export function embedDepart(ctx: ContexteMembre, dureeJours: number): EmbedBuilder {
  const anciennete =
    dureeJours > 0
      ? `${dureeJours} jour${dureeJours > 1 ? "s" : ""} parmi nous`
      : "arrivé aujourd'hui";

  return new EmbedBuilder()
    .setColor(COULEURS.information)
    .setAuthor({ name: `${ctx.pseudo} quitte le Delphinat`, iconURL: avatar(ctx.identifiant) })
    .setDescription(
      [
        `**${ctx.pseudo}** — ${anciennete}.`,
        ctx.roles.length > 0
          ? `Rôles portés : ${ctx.roles.join(", ")}`
          : "Aucun rôle à signaler.",
      ].join("\n"),
    )
    .addFields({
      name: "Revenir",
      value: "Le compte reste rattaché à sa page du wiki. Rien n'est effacé.",
    })
    .setFooter({ text: PIED })
    .setTimestamp(new Date());
}

/**
 * Message d'étapes complet, pour la commande `/bienvenue`.
 *
 * Il reprend les mêmes étapes que le message d'accueil, développé cette fois :
 * une commande se lit dans l'emb permanence, un message d'accueil non.
 */
export function embedEtapes(wiki: string, constitution: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COULEURS.or)
    .setAuthor({ name: "Devenir membre du IIIe Delphinat de Gratianopolis" })
    .setDescription(
      [
        "Quatre étapes. Aucune n'est un obstacle, et toutes sont vérifiables.",
        "`/lien` est celle qui compte : c'est elle qui rattache votre compte Discord à votre page du wiki.",
      ].join("\n"),
    )
    .addFields(ETAPES.map(([nom, valeur]) => ({ name: nom, value: valeur })))
    .addFields({
      name: "À lire",
      value: [
        `[Constitution](${constitution}) — le texte fondateur`,
        `[Encyclopédie du wiki](${wiki}) — articles et institutions`,
      ].join("\n"),
    })
    .setFooter({ text: PIED })
    .setTimestamp(new Date());
}

/** Avatar d'un compte, ou aucune icône si Discord n'en donne pas. */
function avatar(identifiant: string): string {
  return `https://cdn.discordapp.com/avatars/${identifiant}/${identifiant}.png`;
}
