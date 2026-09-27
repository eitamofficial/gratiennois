import rosterJson from "../../shared/roster.json";
import type { UserRole } from "./types";

/**
 * Configuration partagée entre le wiki et le bot Discord.
 *
 * Source unique de vérité pour le **rattachement** entre le serveur Discord et
 * les pages du wiki : un rôle du serveur pointe vers un article, un
 * identifiant utilisateur Discord pointe vers un personnage. Le bot lit ce même
 * fichier, ce qui garantit qu'un changement de rôle sur Discord se retrouve
 * dans le wiki sans double saisie.
 *
 * Le fichier est **validé à la lecture** : une entrée mal formée est ignorée
 * avec un avertissement en console plutôt que de faire tomber la page. Une
 * configuration cassée ne doit pas rendre le wiki illisible.
 */

interface RosterCharacter {
  slug: string;
  nom: string;
  discordUserId: string;
  aliases: string[];
  roles: string[];
  charge: string;
  actif: boolean;
}

interface RoleMapping {
  roleDiscord: string;
  charge: string;
  articleSlug: string;
  libelle: string;
}

interface HistoryEntry {
  id: string;
  libelle: string;
  articleSlug: string;
  periode: string;
  ordre: number;
}

export interface Roster {
  version: number;
  invite: string;
  personnages: RosterCharacter[];
  roleMapping: RoleMapping[];
  historique: HistoryEntry[];
}

/** Normalisation d'un nom : sans accents, en minuscules, pour comparer. */
function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function load(): Roster {
  const raw = rosterJson as unknown as Record<string, unknown>;
  const guild = (raw.guild ?? {}) as Record<string, unknown>;
  const characters = Array.isArray(raw.personnages) ? raw.personnages : [];
  const mapping = Array.isArray(raw.roleMapping) ? raw.roleMapping : [];
  const history = Array.isArray(raw.historique) ? raw.historique : [];

  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    invite: typeof guild.invite === "string" ? guild.invite : "",
    // Un personnage sans slug ni nom ne peut rien rattacher : on l'écarte.
    personnages: characters
      .filter(
        (item): item is RosterCharacter =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RosterCharacter).slug === "string" &&
          typeof (item as RosterCharacter).nom === "string",
      )
      .map((item) => ({
        slug: item.slug,
        nom: item.nom,
        discordUserId: typeof item.discordUserId === "string" ? item.discordUserId : "",
        aliases: isStringArray(item.aliases) ? item.aliases : [],
        roles: isStringArray(item.roles) ? item.roles : [],
        charge: typeof item.charge === "string" ? item.charge : "",
        actif: item.actif !== false,
      })),
    roleMapping: mapping
      .filter(
        (item): item is RoleMapping =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RoleMapping).roleDiscord === "string" &&
          typeof (item as RoleMapping).charge === "string",
      )
      .map((item) => ({
        roleDiscord: item.roleDiscord,
        charge: item.charge,
        articleSlug: typeof item.articleSlug === "string" ? item.articleSlug : "",
        libelle: typeof item.libelle === "string" ? item.libelle : item.roleDiscord,
      })),
    historique: history
      .filter(
        (item): item is HistoryEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as HistoryEntry).articleSlug === "string",
      )
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : item.articleSlug,
        libelle: typeof item.libelle === "string" ? item.libelle : item.articleSlug,
        articleSlug: item.articleSlug,
        periode: typeof item.periode === "string" ? item.periode : "",
        ordre: typeof item.ordre === "number" ? item.ordre : 0,
      }))
      .sort((a, b) => a.ordre - b.ordre),
  };
}

let cached: Roster | null = null;

/** Configuration partagée, lue une seule fois par processus. */
export function getRoster(): Roster {
  if (!cached) cached = load();
  return cached;
}

/** Personnage à partir de son identifiant utilisateur Discord. */
export function characterByDiscordId(userId: string): RosterCharacter | null {
  if (!userId) return null;
  return (
    getRoster().personnages.find(
      (character) => character.discordUserId && character.discordUserId === userId,
    ) ?? null
  );
}

/** Personnage à partir du slug de sa page wiki. */
export function characterBySlug(slug: string): RosterCharacter | null {
  return getRoster().personnages.find((character) => character.slug === slug) ?? null;
}

/**
 * Retrouve un personnage par son **nom de rôle Discord** (par exemple
 * « Dauphin » sur un membre nommé autrement). Comparaison sans accents ni casse,
 * comme partout ailleurs dans le wiki.
 */
export function characterByRoleName(roleName: string): RosterCharacter | null {
  const target = normalizeName(roleName);
  if (!target) return null;
  return (
    getRoster().personnages.find((character) => character.roles.some((role) => normalizeName(role) === target)) ??
    null
  );
}

/** Retrouve un personnage par son nom d'affichage ou l'un de ses alias. */
export function characterByName(name: string): RosterCharacter | null {
  const target = normalizeName(name);
  if (!target) return null;
  return (
    getRoster().personnages.find(
      (character) =>
        normalizeName(character.nom) === target ||
        character.aliases.some((alias) => normalizeName(alias) === target),
    ) ?? null
  );
}

/** Rôle constitutional associé à un libellé de rôle Discord, s'il en existe un. */
export function chargeForDiscordRole(roleName: string): UserRole | null {
  const target = normalizeName(roleName);
  const mapping = getRoster().roleMapping.find(
    (entry) => normalizeName(entry.roleDiscord) === target,
  );
  return mapping ? (mapping.charge as UserRole) : null;
}

/** Article à afficher pour un rôle Discord. */
export function articleForDiscordRole(roleName: string): string | null {
  const target = normalizeName(roleName);
  const mapping = getRoster().roleMapping.find(
    (entry) => normalizeName(entry.roleDiscord) === target,
  );
  return mapping?.articleSlug || null;
}

/** Page de personnage à afficher pour un rôle Discord (rôle personnalisé). */
export function slugForDiscordRole(roleName: string): string | null {
  return characterByRoleName(roleName)?.slug ?? null;
}

/** Périodes historiques, de la plus ancienne à la plus récente. */
export function getHistoryPeriods(): HistoryEntry[] {
  return getRoster().historique;
}
