/**
 * Aides communes aux commandes.
 *
 * Une commande doit répondre en trois lignes : lire ses options, faire son
 * travail, répondre. Tout ce qui est répétitif — répondre sans se soucier de
 * savoir si l'interaction a été différée, retrouver le salon vocal de
 * l'appelant, vérifier une permission — vit ici.
 */

import { ChannelType, PermissionFlagsBits } from "discord.js";

/**
 * Dépose un avis dans le salon d'alertes, à défaut dans le journal.
 *
 * Renvoie `true` si l'avis a trouvé preneur : une commande peut ainsi dire
 * franchement qu'aucun salon n'est configuré, plutôt que de laisser croire
 * qu'une alerte a été envoyée.
 */
export async function deposerAlerte(contexte, interaction, embed) {
  const reglages = contexte.stockage.serveur(interaction.guildId);
  const salonId = reglages.alertes ?? reglages.journal;
  if (!salonId) return false;

  const salon = await interaction.guild.channels.fetch(salonId).catch(() => null);
  if (!salon?.isTextBased()) return false;

  await salon.send({ embeds: [embed] }).catch(() => {});
  return true;
}

/** Répond à une interaction, différée ou non. */
export async function repondre(interaction, contenu, options = {}) {
  const charge = typeof contenu === "string" ? { content: contenu } : { embeds: [contenu] };

  if (interaction.deferred) return interaction.editReply(charge);
  if (interaction.replied) return interaction.followUp({ ...charge, flags: options.ephemere ? 64 : undefined });

  return interaction.reply({ ...charge, flags: options.ephemere ? 64 : undefined });
}

/** Confirme en privé : l'appelant seul voit la réponse. */
export function repondreEnPrive(interaction, contenu) {
  return repondre(interaction, contenu, { ephemere: true });
}

/** Le membre est-il l'un des propriétaires déclarés du bot ? */
export function estProprietaire(configuration, interaction) {
  const membreId = interaction.member?.id ?? interaction.user?.id ?? "";
  if (configuration.proprietaires.includes(membreId)) return true;
  // Le propriétaire du serveur garde toujours la main.
  return Boolean(interaction.guild && interaction.guild.ownerId === membreId);
}

/** Le membre peut-il modérer : permissions Discord ou statut de propriétaire. */
export function peutModerer(interaction, configuration) {
  if (estProprietaire(configuration, interaction)) return true;
  const permissions = interaction.memberPermissions;
  if (!permissions) return false;
  return (
    permissions.has(PermissionFlagsBits.ManageMessages) ||
    permissions.has(PermissionFlagsBits.KickMembers) ||
    permissions.has(PermissionFlagsBits.BanMembers) ||
    permissions.has(PermissionFlagsBits.ModerateMembers)
  );
}

/** L'appelant est-il dans un salon vocal ? Sinon, la raison est renvoyée. */
export function salonVocalDe(interaction) {
  const salon = interaction.member?.voice?.channel ?? null;
  if (!salon) return { salon: null, raison: "Vous devez être dans un salon vocal pour cela." };
  if (!LecteurAccepte(salon.type)) {
    return { salon: null, raison: "Ce salon n'est pas un salon vocal." };
  }
  return { salon, raison: null };
}

/** Le bot et le membre sont-ils dans le même salon vocal ? */
export function memeSalonVocal(interaction, salle) {
  const salon = interaction.member?.voice?.channel ?? null;
  if (!salon) return { ok: false, raison: "Vous devez être dans un salon vocal pour cela." };
  if (salle && salle.connexion.joinConfig.channelId !== salon.id) {
    return { ok: false, raison: "Vous devez être dans le même salon vocal que le bot." };
  }
  return { ok: true, raison: null };
}

function LecteurAccepte(type) {
  return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
}

/** Retrouve un membre à partir d'une option « membre » ou « utilisateur ». */
export function membreDe(interaction, nomOption) {
  const option = interaction.options.get(nomOption);
  if (!option) return interaction.options.getMember("membre") ?? null;
  return option.member ?? null;
}

/** Texte d'affichage d'un membre, sans risque de mention parasite. */
export function nomDe(membre) {
  return membre?.displayName ?? membre?.user?.username ?? "un membre";
}

/** Date Discord relative, dans un champ d'embed. */
export function mentionnerSalon(salon) {
  return salon ? `<#${salon.id}>` : "non configuré";
}
