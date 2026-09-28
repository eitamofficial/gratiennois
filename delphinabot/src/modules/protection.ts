/**
 * Protection des messages.
 *
 * Quatre filtres, appliqués dans cet ordre, tous désactivables par serveur :
 * mentions en masse, flood, liens non autorisés, mots interdits. Chacun a une
 * sanction graduation, parce qu'un message supprimé n'apprend rien à
 * personne : c'est l'avertissement privé quicorrige.
 *
 * Deux principes de conception :
 *
 * - **la modération n'est jamais sanctionnée par ses propres règles.** Un
 *   membre qui peut gérer les messages du salon ne passe pas dans le filtre ;
 * - **le filtre ne s'applique pas à lui-même.** Le message du bot et ceux
 *   des autres bots sont ignorés, sinon `/de` se déclencherait tout seul.
 */

import { PermissionFlagsBits, type Message } from "discord.js";
import type { Delphinabot } from "../client.js";
import type { ReglagesServeur } from "../db/serveur.js";
import { journal } from "../logger.js";
import { journaliser } from "../db/journal.js";
import {
  compterMentions,
  domaine,
  extraireLiens,
  normaliser,
  ressemblant,
} from "../lib/texte.js";
import { sanctionner } from "./moderation/sanction.js";
import { enregistrerMessage } from "../db/membres.js";

/** Sanction appliquée par filtre, graduée selon la gravité. */
const SANCTIONS = {
  mentions: { type: "delai" as const, duree: 10 * 60_000, motif: "Mentions en masse" },
  flood: { type: "delai" as const, duree: 5 * 60_000, motif: "Envoi de messages en rafale" },
  lien: { type: "delai" as const, duree: 5 * 60_000, motif: "Lien non autorisé" },
  mot: { type: "avertissement" as const, duree: null, motif: "Terme interdit" },
};

export interface VerdictMessage {
  /** Un filtre a-t-il agi ? */
  sanctionne: boolean;
  /** Le message doit-il être supprimé ? */
  supprimer: boolean;
  /** XP et ducats gagnés. */
  gains: number;
  montee: boolean;
}

/** Le membre est-il exempté des filtres ? */
function exempt(membre: Message["member"], serveur: ReglagesServeur): boolean {
  if (!membre) return true;
  if (membre.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  if (membre.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (serveur.roleModeration && membre.roles.cache.has(serveur.roleModeration)) return true;
  return false;
}

/**
 * Applique les protections à un message, puis enregistre la progression.
 *
 * La progression est créditée même pour un message filtré : le membre a
 * parlé, donc il participe. Seule la sanction change.
 */
export async function verifierMessage(
  bot: Delphinabot,
  message: Message,
  serveur: ReglagesServeur,
): Promise<VerdictMessage> {
  const vide: VerdictMessage = { sanctionne: false, supprimer: false, gains: 0, montee: false };
  if (message.author.bot || !message.inGuild() || !message.guild) return vide;
  if (serveur.salonsIgnores.includes(message.channelId)) return vide;
  if (exempt(message.member, serveur)) return vide;
  if (message.content.trim().length === 0) return vide;

  const membre = message.member;
  if (!membre) return vide;

  const nomUsurpe = await detecterUsurpation(bot, message, serveur);
  if (nomUsurpe) {
    await message
      .reply("Ce nom d'utilisateur est réservé à l'administration du serveur : choisissez-en un autre.")
      .catch(() => undefined);
  }

  let sanctionne = false;
  let supprimer = false;

  // --- Mentions en masse --------------------------------------------------
  if (serveur.protectionMentions) {
    const mentions = compterMentions(message.content);
    if (mentions > serveur.mentionsMax) {
      await appliquer(bot, message, membre, SANCTIONS.mentions, mentions);
      sanctionne = true;
      supprimer = true;
    }
  }

  // --- Flood --------------------------------------------------------------
  if (!sanctionne && serveur.protectionFlood) {
    const nombre = bot.envois.ajouter(`${message.guild.id}:${message.author.id}`, 10_000);
    if (nombre > serveur.floodMax) {
      await appliquer(bot, message, membre, SANCTIONS.flood, nombre);
      sanctionne = true;
    }
  }

  // --- Liens --------------------------------------------------------------
  if (!sanctionne && serveur.protectionLiens) {
    const interdits = extraireLiens(message.content).filter(
      (url) => !serveur.liensAutorises.some((autorise) => domaine(url).endsWith(autorise)),
    );
    if (interdits.length > 0) {
      await appliquer(bot, message, membre, SANCTIONS.lien, interdits[0]);
      sanctionne = true;
      supprimer = true;
    }
  }

  // --- Mots interdits -----------------------------------------------------
  if (!sanctionne && serveur.protectionMots && serveur.motsInterdits.length > 0) {
    const texte = normaliser(message.content);
    const trouve = serveur.motsInterdits.find((mot) => texte.includes(mot));
    if (trouve) {
      await appliquer(bot, message, membre, SANCTIONS.mot, trouve);
      sanctionne = true;
      supprimer = true;
    }
  }

  if (supprimer) {
    await message.delete().catch(() => undefined);
  }

  // --- Progression --------------------------------------------------------
  const progression = await enregistrerMessage(message.guild.id, message.author.id, {
    xpParMessage: serveur.xpParMessage,
    xpMultiplicateur: serveur.xpMultiplicateur,
    gainsParMessage: serveur.gainsParMessage,
    gainsMaxJour: serveur.gainsMaxJour,
    xpActif: serveur.xpActif,
    economieActive: serveur.economieActive,
  });

  if (progression.montee) {
    await message
      .reply(`<@${message.author.id}> atteint le **niveau ${progression.niveauApres}**.`)
      .catch(() => undefined);
  }

  return { sanctionne, supprimer, gains: progression.gains, montee: progression.montee };
}

/** Applique une sanction issue d'un filtre. */
async function appliquer(
  bot: Delphinabot,
  message: Message,
  membre: NonNullable<Message["member"]>,
  sanction: { type: "delai" | "avertissement"; duree: number | null; motif: string },
  detail: string | number,
): Promise<void> {
  const guild = message.guild;
  if (!guild) return;

  const resultat = await sanctionner(guild, {
    type: sanction.type,
    cible: membre,
    auteurId: bot.user?.id ?? "delphinabot",
    raison: `${sanction.motif} (${detail})`,
    dureeMs: sanction.duree,
    silencieux: false,
  });

  if (!resultat.ok) {
    journal.warn(`Protection ${sanction.motif} : ${resultat.raison}`);
    return;
  }

  await journaliser({
    serveurId: guild.id,
    type: "protection",
    utilisateurId: membre.id,
    cibleId: null,
    details: { motif: sanction.motif, detail: String(detail) },
  });
}

/**
 * Détecte un pseudo qui cherche à imiter l'administration.
 *
 * La comparaison est faite sur les noms **des rôles** d'administration et de
 * modération, pas sur une liste codée en dur : c'est la seule liste qui
 * reste juste quand l'équipe change. Le nom du bot lui-même complète la liste.
 *
 * Le rôle d'administration n'est pas en cause — un membre qui le porte est un
 * administrateur légitime, et le bot n'a rien à lui dire.
 */
async function detecterUsurpation(
  bot: Delphinabot,
  message: Message,
  serveur: ReglagesServeur,
): Promise<boolean> {
  const membre = message.member;
  const guild = message.guild;
  if (!membre || !guild) return false;
  if (membre.permissions.has(PermissionFlagsBits.Administrator)) return false;
  if (membre.roles.cache.has(serveur.roleAdmin ?? "")) return false;

  const nom = membre.displayName;
  if (bot.pseudos.estReserve(nom)) return true;

  const proteges: string[] = [];
  if (bot.user?.username) proteges.push(bot.user.username);
  for (const roleId of [serveur.roleAdmin, serveur.roleModeration]) {
    if (!roleId) continue;
    const role = guild.roles.cache.get(roleId);
    if (role) proteges.push(role.name);
  }
  if (proteges.length === 0) return false;

  if (proteges.some((protege) => ressemblant(nom, protege))) {
    bot.pseudos.ajouter(nom, proteges);
    await journaliser({
      serveurId: guild.id,
      type: "usurpation",
      utilisateurId: membre.id,
      cibleId: null,
      details: { nom, proteges },
    });
    return true;
  }

  return false;
}
