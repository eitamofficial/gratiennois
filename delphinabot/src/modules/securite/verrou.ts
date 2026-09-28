/**
 * Verrouillage du serveur.
 *
 * C'est la mesure d'urgence du bot. Elle est déclenchée à la main, ou
 * automatiquement quand la détection de raid voit une rafale d'arrivées.
 *
 * Ce que « verrouillé » veut dire exactement, et rien de plus :
 *
 * - tout nouveau membre reçoit le rôle de quarantaine, s'il est configuré, et
 *   ne reçoit plus le rôle d'accueil automatique ;
 * - les membres déjà présents ne sont pas touchés — un raid n'a jamais annulé
 *   les droits de ceux qui étaient là avant ;
 * - un message est publié dans le salon d'alerte, avec un bouton pour
 *   lever le verrou.
 *
 * Le verrou est un **drapeau en base**, pas une modification de permissions
 * Discord : il se lève donc même si le bot redémarre au milieu d'un raid, et
 * il ne laisse jamais le serveur sans rôle d'administration.
 */

import { EmbedBuilder, type Guild } from "discord.js";
import { enregistrerReglages, lireReglages } from "../../db/serveur.js";
import { journaliser } from "../../db/journal.js";
import { journal } from "../../logger.js";
import { attention, or } from "../../lib/embres.js";
import { estSalonTextuel } from "../../commandes/outils.js";
import { Boutons } from "../../core/types.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

/** Message publié dans le salon d'alerte quand le verrou tombe. */
export async function verrouiller(
  guild: Guild,
  auteurId: string,
  raison: string,
): Promise<{ ok: boolean; raison: string | null; nombre: number }> {
  const reglages = await lireReglages(guild.id);
  if (reglages.verrouille) {
    return { ok: false, raison: "Le serveur est déjà verrouillé.", nombre: 0 };
  }

  await enregistrerReglages(guild.id, { verrouille: true });
  await journaliser({
    serveurId: guild.id,
    type: "verrouillage",
    utilisateurId: auteurId,
    cibleId: null,
    details: { raison },
  });

  let nombre = 0;
  if (reglages.roleQuarantaine) {
    try {
      const role = await guild.roles.fetch(reglages.roleQuarantaine);
      if (role) {
        const membres = await guild.members.fetch();
        for (const membre of membres.values()) {
          if (!membre.roles.cache.has(role.id) && !membre.user.bot) {
            await membre.roles.add(role, "Verrouillage du serveur").catch(() => undefined);
            nombre += 1;
          }
        }
      }
    } catch (erreurRevue) {
      journal.warn(`Verrouillage : rôle de quarantaine inaccessible — ${erreurRevue}`);
    }
  }

  await annoncer(guild, guild.id, "🔒", "Serveur verrouillé", raison, auteurId);
  journal.info(`Serveur ${guild.id} verrouille (${raison}).`);
  return { ok: true, raison: null, nombre };
}

/** Lève le verrou et retire la quarantaine. */
export async function deverrouiller(
  guild: Guild,
  auteurId: string,
): Promise<{ ok: boolean; raison: string | null; nombre: number }> {
  const reglages = await lireReglages(guild.id);
  if (!reglages.verrouille) {
    return { ok: false, raison: "Le serveur n'est pas verrouillé.", nombre: 0 };
  }

  await enregistrerReglages(guild.id, { verrouille: false });
  await journaliser({
    serveurId: guild.id,
    type: "deverrouillage",
    utilisateurId: auteurId,
    cibleId: null,
    details: {},
  });

  let nombre = 0;
  if (reglages.roleQuarantaine) {
    try {
      const membres = await guild.members.fetch();
      for (const membre of membres.values()) {
        if (membre.roles.cache.has(reglages.roleQuarantaine) && !membre.user.bot) {
          await membre.roles
            .remove(reglages.roleQuarantaine, "Levée du verrouillage")
            .catch(() => undefined);
          nombre += 1;
        }
      }
    } catch (erreurRevue) {
      journal.warn(`Déverrouillage : ${erreurRevue}`);
    }
  }

  await annoncer(guild, guild.id, "🔓", "Serveur déverrouillé", "Les arrivées reprennent normalement.", auteurId);
  journal.info(`Serveur ${guild.id} deverrouille.`);
  return { ok: true, raison: null, nombre };
}

/** Publie une annonce d'état dans le salon d'alerte, à défaut le salon de logs. */
export async function annoncer(
  guild: Guild,
  salonId: string | null,
  emojie: string,
  titre: string,
  description: string,
  auteurId: string,
): Promise<void> {
  if (!salonId) return;

  const salon = guild.channels.cache.get(salonId);
  if (!salon || !estSalonTextuel(salon)) return;

  const embed: EmbedBuilder = or(description, `${emojie} ${titre}`).setColor(0xa32d2d);
  const auteur = await guild.members.fetch(auteurId).catch(() => null);
  if (auteur) embed.setAuthor({ name: auteur.displayName });

  const ligne = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(Boutons.deverrouiller)
      .setLabel("Lever le verrou")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🔓"),
  );

  await salon
    .send({ embeds: [embed], components: [ligne] })
    .catch((erreurRevue) => journal.warn(`Annonce impossible : ${erreurRevue}`));
}

/** Message d'alerte simple, sans bouton. */
export function alerte(titre: string, description: string): EmbedBuilder {
  return attention(description, titre);
}
