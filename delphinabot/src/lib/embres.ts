/**
 * Habillage des réponses.
 *
 * Toutes les réponses du bot sont des *embeds* : un encadré coloré, lisible
 * d'un coup d'œil, qui ne sature pas le salon. Les couleurs portent le sens
 * (or du Delphinat pour l neutre, rouge pour l'erreur, vert pour la
 * réussite), et le nom du bot reste en pied d'uniformité.
 */

import { EmbedBuilder, type APIEmbedField } from "discord.js";

/** Palette du Delphinat, alignée sur celle du wiki. */
export const COULEURS = {
  or: 0xd4a63a,
  encre: 0x141824,
  reussite: 0x2f7d4f,
  alerte: 0xb8871f,
  danger: 0xa32d2d,
  information: 0x3b6ea5,
} as const;

const PIED = "DelphinaBot · IIIe Delphinat de Gratianopolis";

/** Embed neutre : la couleur d'or du Delphinat, sans titre imposé. */
export function or(description: string, titre?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COULEURS.or)
    .setDescription(description)
    .setFooter({ text: PIED })
    .setTimestamp(new Date());
  if (titre) embed.setTitle(titre);
  return embed;
}

/** Réussite. */
export function succes(description: string, titre?: string): EmbedBuilder {
  const embed = or(description, titre);
  embed.setColor(COULEURS.reussite);
  return embed;
}

/** Avertissement : quelque chose va peut-être mal, mais rien de bloquant. */
export function attention(description: string, titre?: string): EmbedBuilder {
  const embed = or(description, titre);
  embed.setColor(COULEURS.alerte);
  return embed;
}

/** Erreur : la commande n'a pas pu aboutir. */
export function erreur(description: string, titre = "Commande impossible"): EmbedBuilder {
  const embed = or(description, titre);
  embed.setColor(COULEURS.danger);
  return embed;
}

/** Information neutre, en bleu, pour les états de fonctionnement. */
export function information(description: string, titre?: string): EmbedBuilder {
  const embed = or(description, titre);
  embed.setColor(COULEURS.information);
  return embed;
}

/**
 * Transforme des paires en champs d'embed.
 *
 * `EmbedBuilder.setFields` refuse un tableau typé en `APIEmbedFieldOptions` dès
 * qu'il est construit à la main ; cette fonction évite de se battre avec le
 * typage à chaque appel.
 */
export function champs(
  entrees: [nom: string, valeur: string, inline?: boolean][],
): APIEmbedField[] {
  return entrees.map(([nom, valeur, inline]) => ({
    name: nom.slice(0, 256),
    value: (valeur || "—").slice(0, 1024),
    inline: inline ?? false,
  }));
}
