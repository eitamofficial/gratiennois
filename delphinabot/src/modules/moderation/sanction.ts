/**
 * Application d'une sanction.
 *
 * Toutes les sanction passent par ici : `/avertir`, `/delai`, la détection de
 * flood, l'escalade automatique. Un seul chemin signifie une seule façon de
 * compter les points, d'écrire dans le journal et de prévenir la modération.
 *
 * Deux principes :
 *
 * - **on n'agit jamais sur quelqu'un qu'on ne peut pas atteindre** ; la
 *   hiérarchie Discord est vérifiée avant toute écriture ;
 * - **une sanction expirée est levée par le bot lui-même**, pas oubliée.
 */

import { EmbedBuilder, type Guild, type GuildMember } from "discord.js";
import {
  compterActives,
  enregistrerSanction,
  leverToutes,
  type TypeSanction,
} from "../../db/sanctions.js";
import {
  incrementerAvertissements,
  incrementerInfractions,
} from "../../db/membres.js";
import { journaliser } from "../../db/journal.js";
import { lireReglages } from "../../db/serveur.js";
import { journal } from "../../logger.js";
import { estSalonTextuel } from "../../commandes/outils.js";
import { attention, succes } from "../../lib/embres.js";
import { formaterDuree } from "../../lib/duree.js";
import { peutAgir } from "../../core/permissions.js";

export interface DemandeSanction {
  type: TypeSanction;
  cible: GuildMember;
  auteurId: string;
  raison: string;
  dureeMs?: number | null;
  /** Ne pas preventionner la cible (mesure silencieuse). */
  silencieux?: boolean;
}

export interface ResultatSanction {
  ok: boolean;
  raison: string | null;
  sanctionsActives: number;
  niveau: TypeSanction | null;
}

/** Seuil au-delà duquel la modération est prevenue automatiquement. */
const SEUIL_ESCALADE = 3;

/**
 * Applique une sanction et journalise l'opération.
 *
 * L'escalade est automatique et reversible : au-delà de trois sanctions
 * actives, une alerte part dans le salon des sanctions. Le bot ne décide
 * **jamais** seul d'une exclusion ou d'un bannissement définitif — c'est une
 * décision humaine, et le journal doit le montrer.
 */
export async function sanctionner(
  guild: Guild,
  demande: DemandeSanction,
): Promise<ResultatSanction> {
  const { cible, type, auteurId, raison } = demande;

  if (cible.id === auteurId) {
    return { ok: false, raison: "On ne se sanctionne pas soi-même.", sanctionsActives: 0, niveau: null };
  }

  const autorise = peutAgir(guild, cible);
  if (!autorise.ok) {
    return { ok: false, raison: autorise.raison, sanctionsActives: 0, niveau: null };
  }

  try {
    switch (type) {
      case "avertissement": {
        await incrementerAvertissements(guild.id, cible.id);
        break;
      }
      case "delai": {
        const duree = demande.dureeMs ?? 600_000;
        // Discord refuse un délai de plus de 28 jours : on borne ici plutôt
        // que de laisser remonter une erreur brute.
        await cible.timeout(Math.min(duree, 28 * 86_400_000), `DelphinaBot : ${raison}`);
        break;
      }
      case "sourdine": {
        const reglages = await lireReglages(guild.id);
        const role = reglages.roleMute
          ? await guild.roles.fetch(reglages.roleMute).catch(() => null)
          : guild.roles.cache.find((element) => element.name.toLowerCase().includes("sourdine"));
        if (!role) {
          return {
            ok: false,
            raison: "Aucun rôle de sourdine n'existe sur ce serveur. Créez-le ou nommez-le « Sourdine ».",
            sanctionsActives: 0,
            niveau: null,
          };
        }
        const positionDuBot = guild.members.me?.roles.highest.position ?? 0;
        if (role.position >= positionDuBot) {
          return {
            ok: false,
            raison: "Le rôle de sourdine est au-dessus de celui du bot : remontez DelphinaBot.",
            sanctionsActives: 0,
            niveau: null,
          };
        }
        await cible.roles.add(role, `DelphinaBot : ${raison}`);
        break;
      }
      case "exclusion": {
        await cible.kick(`DelphinaBot : ${raison}`);
        break;
      }
      case "bannissement": {
        await guild.bans.create(cible.id, {
          reason: `DelphinaBot : ${raison}`,
          deleteMessageSeconds: 0,
        });
        break;
      }
    }
  } catch (erreurRevue) {
    journal.error(`Sanction ${type} impossible sur ${cible.id} : ${erreurRevue}`);
    return {
      ok: false,
      raison: `Discord a refusé l'opération : ${(erreurRevue as Error).message}`,
      sanctionsActives: 0,
      niveau: null,
    };
  }

  await incrementerInfractions(guild.id, cible.id);
  await enregistrerSanction({
    serveurId: guild.id,
    utilisateurId: cible.id,
    type,
    raison,
    auteurId,
    dureeMs: demande.dureeMs ?? null,
  });

  await journaliser({
    serveurId: guild.id,
    type: "sanction",
    utilisateurId: auteurId,
    cibleId: cible.id,
    details: { sanction: type, raison, dureeMs: demande.dureeMs ?? null },
  });

  if (!demande.silencieux) await prevenirCible(guild, cible, type, raison, demande.dureeMs);

  const actives = await compterActives(guild.id, cible.id);
  if (actives >= SEUIL_ESCALADE) {
    await alerterEscalade(guild, cible, actives);
  }

  return { ok: true, raison: null, sanctionsActives: actives, niveau: type };
}

/** Message privé adressé au membre sanctionné. */
async function prevenirCible(
  guild: Guild,
  cible: GuildMember,
  type: TypeSanction,
  raison: string,
  dureeMs: number | null | undefined,
): Promise<void> {
  const details: string[] = [
    `**Raison** : ${raison || "aucune"}`,
    `**Serveur** : ${guild.name}`,
    "Ce message est privé : personne d'autre que vous ne le voit.",
  ];
  if (type === "delai" && dureeMs) {
    details.push(`**Durée** : ${formaterDuree(dureeMs)}`);
  }
  if (type === "avertissement") {
    details.push("Un avertissement n'est pas une sanction définitive, mais il compte.");
  }

  await cible
    .user.send({ embeds: [succes(details.join("\n"), `Sanction : ${type}`)] })
    .catch(() => undefined);
}

/** Alerte d'escalade dans le salon des sanctions. */
async function alerterEscalade(
  guild: Guild,
  cible: GuildMember,
  actives: number,
): Promise<void> {
  const salon = guild.channels.cache.find(
    (element) => element.name.toLowerCase().includes("sanction") || element.name.toLowerCase().includes("mod"),
  );
  if (!salon || !estSalonTextuel(salon)) return;

  await salon
    .send({
      embeds: [
        attention(
          [
            `**${cible.user.tag}** cumule **${actives} sanctions actives**.`,
            "Une décision est attendue de l'équipe de modération.",
            "Le bot n'applique jamais seul une exclusion ou un bannissement définitif.",
          ].join("\n"),
          "Escalade",
        ),
      ],
    })
    .catch(() => undefined);
}

/** Lève toutes les sanctions actives d'un type donné. */
export async function revoquer(
  guild: Guild,
  cible: GuildMember,
  type: TypeSanction | "toutes",
  auteurId: string,
): Promise<{ ok: boolean; raison: string | null; levees: number }> {
  const types: TypeSanction[] =
    type === "toutes"
      ? ["avertissement", "delai", "sourdine", "exclusion", "bannissement"]
      : [type];

  let levees = 0;
  for (const element of types) {
    if (element === "delai") {
      await cible.timeout(null, `Levée par DelphinaBot (${auteurId})`).catch(() => undefined);
    }
    if (element === "bannissement") {
      // Seul le bannissement est réellement réversible : le lever, c'est
      // débannir. Une exclusion, elle, ne s'annule pas.
      const bannissement = await guild.bans.fetch(cible.id).catch(() => null);
      if (bannissement) {
        await guild.bans.remove(cible.id, "Bannissement levé par DelphinaBot");
        levees += 1;
      }
    }
    if (element === "sourdine") {
      const reglages = await lireReglages(guild.id);
      const role = reglages.roleMute
        ? await guild.roles.fetch(reglages.roleMute).catch(() => null)
        : guild.roles.cache.find((r) => r.name.toLowerCase().includes("sourdine"));
      if (role) await cible.roles.remove(role, "Levée de la sourdine").catch(() => undefined);
    }
    levees += await leverToutes(guild.id, cible.id, element, auteurId);
  }

  if (levees === 0) {
    return { ok: false, raison: "Aucune sanction active de ce type.", levees: 0 };
  }

  await journaliser({
    serveurId: guild.id,
    type: "sanction-levee",
    utilisateurId: auteurId,
    cibleId: cible.id,
    details: { type },
  });

  return { ok: true, raison: null, levees };
}

/** Embed récapitulatif d'une sanction appliquée. */
export function resumeSanction(
  cible: GuildMember,
  type: TypeSanction,
  raison: string,
  dureeMs: number | null | undefined,
  actives: number,
): EmbedBuilder {
  const lignes = [`**Membre** : ${cible.user.tag}`, `**Sanction** : ${type}`, `**Motif** : ${raison || "aucun"}`];
  if (type === "delai" && dureeMs) lignes.push(`**Durée** : ${formaterDuree(dureeMs)}`);
  lignes.push(`**Sanctions actives** : ${actives}`);
  return succes(lignes.join("\n"), "Sanction appliquée");
}
