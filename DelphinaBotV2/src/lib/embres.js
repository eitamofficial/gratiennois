/**
 * Habillage des réponses.
 *
 * Toutes les réponses du bot sont des *embeds* : un encadré coloré, lisible
 * d'un coup d'œil, qui ne sature pas le salon. Les couleurs portent le sens —
 * or du Delphinat pour le neutre, rouge pour l'erreur, vert pour la réussite —
 * et le nom du bot reste en pied, par uniformité.
 */

import { EmbedBuilder } from "discord.js";

/** Palette du Delphinat, alignée sur celle du wiki. */
export const COULEURS = {
  or: 0xd4a63a,
  encre: 0x141824,
  reussite: 0x2f7d4f,
  alerte: 0xb8871f,
  danger: 0xa32d2d,
  information: 0x3b6ea5,
};

export const PIED = "DelphinaBot · IIIe Delphinat de Gratianopolis";

/**
 * Embed neutre : la couleur d'or du Delphinat, sans titre imposé.
 *
 * Discord refuse une description ou un titre **vide** : `setDescription("")`
 * lève « Received one or more errors » avant même l'envoi, ce qui faisait
 * échouer les commandes qui ne posaient qu'une image ou qu'un titre. On
 * n'appelle donc ces méthodes que lorsqu'il y a de quoi les remplir, et un
 * embed totalement vide — que Discord refuse également — reçoit un tiret.
 */
export function or(description, titre) {
  const corps = description === null || description === undefined ? "" : String(description);
  const entete = titre === null || titre === undefined ? "" : String(titre);

  const embed = new EmbedBuilder().setColor(COULEURS.or).setFooter({ text: PIED }).setTimestamp(new Date());
  if (corps.trim() !== "") embed.setDescription(corps);
  if (entete.trim() !== "") embed.setTitle(entete);
  if (!embed.data.description && !embed.data.title) embed.setDescription("—");
  return embed;
}

/** Réussite. */
export function succes(description, titre) {
  return or(description, titre).setColor(COULEURS.reussite);
}

/** Avertissement : quelque chose va peut-être mal, mais rien de bloquant. */
export function attention(description, titre) {
  return or(description, titre).setColor(COULEURS.alerte);
}

/** Erreur : la commande n'a pas pu aboutir. */
export function erreur(description, titre = "Commande impossible") {
  return or(description, titre).setColor(COULEURS.danger);
}

/** Information neutre, en bleu, pour les états de fonctionnement. */
export function information(description, titre) {
  return or(description, titre).setColor(COULEURS.information);
}

/**
 * Transforme des paires en champs d'embed.
 *
 * Discord refuse un nom de plus de 256 caractères et une valeur de plus de
 * 1024 : on coupe ici, une fois, plutôt que dans chaque commande.
 */
export function champs(entrees) {
  return entrees
    .filter(([, valeur]) => valeur !== null && valeur !== undefined && valeur !== "")
    .map(([nom, valeur, inline]) => ({
      name: String(nom).slice(0, 256),
      value: (valeur === "" ? "—" : String(valeur)).slice(0, 1024),
      inline: inline ?? false,
    }));
}
