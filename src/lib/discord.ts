import { promises as fs } from "node:fs";
import path from "node:path";
import type { DiscordGuild, DiscordMember, DiscordRole, DiscordSnapshot } from "./types";

const DISCORD_API = "https://discord.com/api/v10";
const CACHE_FILE = path.join(process.cwd(), "data", "discord-cache.json");
/** Durée de validité du cache avant nouvelle interrogation de l'API. */
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

export function getDiscordConfig() {
  return {
    token: process.env.DISCORD_BOT_TOKEN?.trim() ?? "",
    guildId: process.env.DISCORD_GUILD_ID?.trim() ?? "",
  };
}

export function isDiscordConfigured(): boolean {
  const { token, guildId } = getDiscordConfig();
  return Boolean(token && guildId);
}

// ---------------------------------------------------------------------------
// Appels REST
// ---------------------------------------------------------------------------

async function discordFetch<T>(pathname: string, token: string): Promise<T> {
  const response = await fetch(`${DISCORD_API}${pathname}`, {
    headers: { Authorization: `Bot ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Discord API ${pathname} → HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

function defaultAvatarIndex(userId: string): number {
  try {
    return Number((BigInt(userId) >> 22n) % 6n);
  } catch {
    return 0;
  }
}

/**
 * Extension à demander au CDN pour une empreinte d'avatar.
 *
 * Discord signale une image **animée** par un préfixe `a_` sur l'empreinte, et
 * ne sert ces images qu'en GIF. Forcer `.png` sur une telle avatar ne renvoyait
 * pas une erreur mais une image **figée** sur la première image : le portrait
 *animé du membre disparaissait sans aucun avertissement. On suit donc le
 * format réel de l'image : GIF si l'empreinte est animée, PNG sinon (le PNG
 * est toujours accepté par le CDN pour une image fixe).
 */
function avatarExtension(hash: string): "gif" | "png" {
  return hash.startsWith("a_") ? "gif" : "png";
}

function memberAvatarUrl(guildId: string, raw: RawMember): string | null {
  const userId = raw.user?.id ?? "";
  if (raw.avatar) {
    const hash = raw.avatar;
    return `https://cdn.discordapp.com/guild-avatars/${guildId}/${hash}.${avatarExtension(hash)}?size=256`;
  }
  if (raw.user?.avatar) {
    const hash = raw.user.avatar;
    return `https://cdn.discordapp.com/avatars/${userId}/${hash}.${avatarExtension(hash)}?size=256`;
  }
  return userId
    ? `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex(userId)}.png`
    : null;
}

interface RawUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

interface RawMember {
  user?: RawUser;
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
  joined_at?: string | null;
}

function normalizeMember(guildId: string, raw: RawMember): DiscordMember | null {
  const user = raw.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    username: user.username,
    globalName: user.global_name ?? null,
    nickname: raw.nick ?? null,
    displayName: raw.nick ?? user.global_name ?? user.username,
    avatarUrl: memberAvatarUrl(guildId, raw),
    roleIds: raw.roles ?? [],
    joinedAt: raw.joined_at ?? null,
    // Le champ `bot` est renvoyé par l'API mais n'était pas repris. Un compte
    // automatique ne doit jamais apparaître ni comme personnalité ni comme
    // citoyen : sans ce drapeau, la détection reposait sur une heuristique
    // based on le pseudo, qu'un humain pouvait imiter.
    isBot: user.bot === true,
  };
}

interface RawGuild {
  id: string;
  name: string;
  icon?: string | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
}

function normalizeGuild(raw: RawGuild): DiscordGuild {
  return {
    id: raw.id,
    name: raw.name,
    iconUrl: raw.icon
      ? `https://cdn.discordapp.com/icons/${raw.id}/${raw.icon}.png?size=128`
      : null,
    memberCount: raw.approximate_member_count ?? null,
    onlineCount: raw.approximate_presence_count ?? null,
  };
}

interface RawRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed?: boolean;
}

function intToHex(color: number): string | null {
  return color > 0 ? `#${color.toString(16).padStart(6, "0")}` : null;
}

// ---------------------------------------------------------------------------
// Snapshot (cache disque : data/discord-cache.json)
// ---------------------------------------------------------------------------

async function readCache(): Promise<DiscordSnapshot | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw) as DiscordSnapshot;
  } catch {
    return null;
  }
}

async function writeCache(snapshot: DiscordSnapshot): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {
    // Le cache disque est une **optimisation**, jamais une condition de
    // fonctionnement. Sur une plateforme sans écriture persistante (Vercel,
    // fonctions éphémères), le répertoire est en lecture seule : sans ce
    // garde-fou, l'échec d'écriture de ce simple cache faisait échouer la
    // synchronisation entière, alors même que l'API venait de répondre. On
    // abandonne le cache et on continue avec les données fraîches en mémoire.
  }
}

/**
 * Interroge l'API Discord et renvoie un snapshot frais.
 * - Membres complets : nécessite le "Server Members Intent" côté portail développeur.
 * - En cas d'échec (403…), on tente la recherche ciblée par nom pour les personnalités.
 */
export async function refreshDiscordSnapshot(): Promise<DiscordSnapshot> {
  const { token, guildId } = getDiscordConfig();
  if (!token || !guildId) {
    throw new Error("DISCORD_BOT_TOKEN et DISCORD_GUILD_ID doivent être configurés.");
  }

  const errors: string[] = [];
  let guild: DiscordGuild | null = null;
  let members: DiscordMember[] = [];
  let roles: DiscordRole[] = [];

  try {
    guild = normalizeGuild(
      await discordFetch<RawGuild>(`/guilds/${guildId}?with_counts=true`, token),
    );
  } catch (error) {
    errors.push(`Serveur : ${(error as Error).message}`);
  }

  try {
    const rawMembers = await discordFetch<RawMember[]>(
      `/guilds/${guildId}/members?limit=1000`,
      token,
    );
    members = rawMembers
      .map((raw) => normalizeMember(guildId, raw))
      .filter((member): member is DiscordMember => member !== null);
  } catch (error) {
    errors.push(
      `Membres : ${(error as Error).message} — vérifiez que le "Server Members Intent" est activé sur le portail développeur Discord.`,
    );
  }

  try {
    const rawRoles = await discordFetch<RawRole[]>(`/guilds/${guildId}/roles`, token);
    roles = rawRoles
      .filter((role) => role.id !== guildId && !role.managed)
      .map((role) => ({
        id: role.id,
        name: role.name,
        color: intToHex(role.color),
        position: role.position,
      }))
      .sort((a, b) => b.position - a.position);
  } catch (error) {
    errors.push(`Rôles : ${(error as Error).message}`);
  }

  const snapshot: DiscordSnapshot = {
    source: "bot",
    fetchedAt: new Date().toISOString(),
    guild,
    members,
    roles,
    errors,
  };
  await writeCache(snapshot);
  return snapshot;
}

/** Snapshot depuis le widget public (aucun token requis, widget activé sur le serveur). */
async function widgetSnapshot(guildId: string): Promise<DiscordSnapshot | null> {
  try {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/widget.json`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      name?: string;
      presence_count?: number;
      members?: Array<{ username?: string; avatar_url?: string }>;
    };
    return {
      source: "widget",
      fetchedAt: new Date().toISOString(),
      guild: {
        id: guildId,
        name: data.name ?? "Serveur Discord",
        iconUrl: null,
        memberCount: null,
        onlineCount: data.presence_count ?? null,
      },
      members: (data.members ?? [])
        .filter((member) => member.username)
        .map((member) => ({
          id: "",
          username: member.username ?? "",
          globalName: null,
          nickname: null,
          displayName: member.username ?? "",
          avatarUrl: member.avatar_url ?? null,
          roleIds: [],
          joinedAt: null,
          // Le widget ne fournit pas le type de compte : on applique la même
          // heuristique que pour l'API, pour ne pas ouvrir de page à un bot.
          isBot: /^bot\d*$/i.test(member.username ?? ""),
        })),
      roles: [],
      errors: [],
    };
  } catch {
    return null;
  }
}

/**
 * Snapshot lisible par les pages : cache si frais, sinon rafraîchissement ;
 * en dernier recours, widget public ; sinon null (site 100 % fonctionnel hors ligne).
 */
export async function getDiscordSnapshot(): Promise<DiscordSnapshot | null> {
  const cached = await readCache();
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS) {
    return cached;
  }

  if (isDiscordConfigured()) {
    try {
      return await refreshDiscordSnapshot();
    } catch {
      // On retombe sur le cache éventuellement périmé, sinon le widget.
      if (cached) return cached;
    }
  }

  const { guildId } = getDiscordConfig();
  if (guildId) {
    const widget = await widgetSnapshot(guildId);
    if (widget) return widget;
  }

  return cached;
}

// ---------------------------------------------------------------------------
// Recherche de membres (résolution des personnalités)
// ---------------------------------------------------------------------------

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Retrouve un membre par nom d'affichage / pseudo / nom d'utilisateur (sans accents). */
/**
 * Membres correspondant à un nom de personnalité.
 *
 * `exact` porte les membres dont un des noms (surnom, pseudo, nom global)
 * est **identique** au nom recherché ; `fuzzy` ceux dont un nom le contient
 * simplement. Les deux listes sont renvoyées entières : c'est au'appelant de
 * refuser une ambiguïté, jamais au hasard.
 */
export function findMembersByName(
  snapshot: DiscordSnapshot | null,
  name: string,
): { exact: DiscordMember[]; fuzzy: DiscordMember[] } {
  const empty = { exact: [] as DiscordMember[], fuzzy: [] as DiscordMember[] };
  if (!snapshot) return empty;
  const target = normalizeName(name);
  if (!target) return empty;

  const exact: DiscordMember[] = [];
  const fuzzy: DiscordMember[] = [];

  for (const member of snapshot.members) {
    const noms = [member.displayName, member.username, member.globalName, member.nickname]
      .filter((valeur): valeur is string => typeof valeur === "string" && valeur.length > 0)
      .map(normalizeName)
      // Un nom qui ne se normalise en rien — pseudonyme entièrement en
      // caractères décoratifs, mathématiques ou japonais — ne prouve rien :
      // on l'écarte, sinon `target.includes("")` est vrai et ce membre
      // correspondrait à *toutes* les personnalités du wiki.
      .filter((nom) => nom.length > 0);

    if (noms.some((nom) => nom === target)) {
      exact.push(member);
      continue;
    }

    // Ressemblance : on exige un minimum de 3 caractères, comme
    // `scripts/link-roster.mjs`, pour ne pas rapprocher sur un fragment.
    const proche = noms.some(
      (nom) =>
        Math.min(nom.length, target.length) >= 3 &&
        (nom.includes(target) || target.includes(nom)),
    );
    if (proche) fuzzy.push(member);
  }

  return { exact, fuzzy };
}

/**
 * Membre correspondant **sans ambiguïté** à un nom de personnalité.
 *
 * Rattacher le mauvais portrait serait pire que de n'en mettre aucun : si
 * plusieurs membres portent le même nom, on renvoie `null` et l'appelant doit
 * trancher. C'est la même règle que celle appliquée par `scripts/link-roster.mjs`.
 */
export function findMemberByName(
  snapshot: DiscordSnapshot | null,
  name: string,
): DiscordMember | null {
  const { exact, fuzzy } = findMembersByName(snapshot, name);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  if (fuzzy.length === 1) return fuzzy[0];
  return null;
}

/** Rôles effectifs d'un membre, triés par importance. */
export function memberRoles(
  snapshot: DiscordSnapshot | null,
  member: DiscordMember | null,
): DiscordRole[] {
  if (!snapshot || !member) return [];
  return snapshot.roles.filter((role) => member.roleIds.includes(role.id));
}
