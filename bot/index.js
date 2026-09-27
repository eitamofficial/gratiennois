/**
 * Bot Discord du IIIe Delphinat de Gratianopolis.
 *
 * Rôle unique : **faire remonter vers le wiki** les changements de rôle et de
 * nom survenus sur le serveur. Le bot n'écrit jamais de contenu : l'écriture du
 * wiki reste réservée aux charges constitutionnelles.
 *
 * Comment la correspondance est établie : le bot et le wiki lisent **le même
 * fichier**, `shared/roster.json`. Une fiche y associe un rôle Discord
 * (`roles`) à une page du wiki (`slug`). Quand un membre reçoit ou perd un rôle
 * connu, le bot envoie au wiki la paire { slug, discordUserId }, signée en HMAC.
 *
 * Installation :
 *   cd bot && npm install
 *   # puis renseigner DISCORD_BOT_TOKEN, WIKI_URL et BOT_SYNC_SECRET
 *   npm start
 *
 * Variables d'environnement (dans bot/.env ou l'environnement du serveur) :
 *   DISCORD_BOT_TOKEN  jeton du bot (jamais écrit dans un fichier versionné)
 *   WIKI_URL           https://…            racine publique du wiki
 *   BOT_SYNC_SECRET    secret partagé avec le wiki (BOT_SYNC_SECRET côté site)
 *   GUILD_ID           identifiant du serveur (par défaut : celui de la config)
 */
import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROSTER_FILE = join(HERE, "..", "shared", "roster.json");

/** Charge le .env local du bot sans dépendance externe. */
function loadEnv() {
  const file = join(HERE, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key]) continue;
    process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}

/** Configuration partagée, lue au démarrage. */
function loadRoster() {
  const roster = JSON.parse(readFileSync(ROSTER_FILE, "utf8"));
  return {
    version: roster.version ?? 1,
    guildId: process.env.GUILD_ID ?? "",
    personnages: roster.personnages ?? [],
  };
}

/** Même normalisation de nom que le wiki : sans accents, en minuscules. */
function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const roster = loadRoster();
const WIKI_URL = (process.env.WIKI_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const BOT_SYNC_SECRET = process.env.BOT_SYNC_SECRET ?? "";

/** Table rôle Discord normalisé → personnage du roster. */
const roleToCharacter = new Map();
for (const character of roster.personnages) {
  for (const role of character.roles ?? []) {
    roleToCharacter.set(normalize(role), character);
  }
}

/** Table nom/alias normalisé → personnage du roster. */
const nameToCharacter = new Map();
for (const character of roster.personnages) {
  nameToCharacter.set(normalize(character.nom), character);
  for (const alias of character.aliases ?? []) {
    nameToCharacter.set(normalize(alias), character);
  }
}

/**
 * Envoie au wiki la liste des rattachements, signée.
 * Sans secret configuré, le bot fonctionne en lecture seule : il journalise
 * ce qu'il détecterait au lieu d'appeler le site.
 */
/** Signe un corps avec le secret partagé : HMAC-SHA256 de `horodatage.corps`. */
function sign(body, timestamp = String(Date.now())) {
  return createHmac("sha256", BOT_SYNC_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function pushToWiki(liens, reason) {
  if (!BOT_SYNC_SECRET) {
    console.warn("[bot] BOT_SYNC_SECRET absent : appel au wiki ignoré.");
    for (const lien of liens) {
      console.warn(`  - ${lien.slug} → ${lien.discordUserId} (${reason})`);
    }
    return;
  }

  const body = JSON.stringify({ liens, source: "bot", rosterVersion: roster.version });
  const timestamp = String(Date.now());
  const signature = sign(body, timestamp);

  try {
    const response = await fetch(`${WIKI_URL}/api/sync/bot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wiki-signature": signature,
        "x-wiki-timestamp": timestamp,
      },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error(`[bot] Wiki a refusé la synchronisation (${response.status}) :`, data.error);
      return;
    }
    console.log(
      `[bot] ${reason} : ${(data.linked ?? []).length} rattachement(s), ` +
        `${(data.ignored ?? []).length} ignoré(s).`,
    );
  } catch (error) {
    console.error("[bot] Wiki injoignable :", error.message);
  }
}

/** Rattachements correspondant aux rôles actuellement portés par un membre. */
function liensForMember(member) {
  const liens = [];
  for (const role of member.roles.cache.values()) {
    const character = roleToCharacter.get(normalize(role.name));
    if (character && !liens.some((lien) => lien.slug === character.slug)) {
      liens.push({ slug: character.slug, discordUserId: member.id });
    }
  }
  return liens;
}

/**
 * Salons de parti surveillés en temps réel.
 *
 * Le bot n'analyse rien lui-même : il **signale** au wiki qu'il y a du
 * nouveau. L'analyse, la lecture du contexte et la rédaction restent côté wiki,
 * où vit la clé Gemini. Ainsi, le secret de l'IA n'est jamais exposé au bot,
 * qui tourne souvent sur une autre machine.
 */
const WATCHED_CHANNELS = [
  {
    id: "1551667779122495649",
    libelle: "〈⭐〉parti-socialiste-révolutionnaire-gratiennois",
    articleSlug: "parti-revolutionnaire-socialiste-gratiennois",
  },
  {
    id: "1552612000700305498",
    libelle: "〈🔬〉union-de-premier-regime",
    articleSlug: "parti-union-de-premier-regime",
  },
  {
    id: "1551961321694826526",
    libelle: "〈📈〉les-libéraux-démocrates",
    articleSlug: "parti-liberaux-democrates-de-frenchserbian",
  },
];

/** Délai minimum entre deux signalements pour un même salon. */
const DELAI_PAR_SALON_MS = 5 * 60 * 1000;

const dernierSignalement = new Map();

/**
 * Signale au wiki qu'un salon de parti a reçu de nouveaux messages.
 *
 * Le signal est volontairement pauvre — un identifiant de salon et une
 * quelques secondes d'horodatage. Le wiki va lui-même relire l'historique :
 * inutile de transporter des messages par le réseau, et cela évite que le bot
 * devienne un relais de données personnelles.
 */
async function signalerSalon(channel, raison) {
  if (!WIKI_URL) return;

  const dernier = dernierSignalement.get(channel.id) ?? 0;
  if (Date.now() - dernier < DELAI_PAR_SALON_MS) return;
  dernierSignalement.set(channel.id, Date.now());

  if (!BOT_SYNC_SECRET) {
    console.log(
      `[bot] Nouveau contenu dans « ${channel.name} » (${raison}) — ` +
        "BOT_SYNC_SECRET absent : signal non transmis.",
    );
    return;
  }

  const body = JSON.stringify({
    source: "bot",
    canaux: [{ channelId: channel.id, raison }],
  });
  const timestamp = String(Date.now());

  try {
    const reponse = await fetch(`${WIKI_URL}/api/sync/bot`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wiki-timestamp": timestamp,
        "x-wiki-signature": sign(body, timestamp),
      },
      body,
    });
    console.log(
      `[bot] Salon « ${channel.name} » signalé — HTTP ${reponse.status}.`,
    );
  } catch (error) {
    console.error("[bot] Signalement impossible :", error.message);
  }
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  // Utile pour que le bot voie les messages des salons qu'il n'a pas en cache.
  partials: [Partials.GuildMember, Partials.Message],
});

client.once("ready", () => {
  console.log(`[bot] Connecté en tant que ${client.user.tag}`);
  console.log(`[bot] Configuration partagée v${roster.version} — ${roster.personnages.length} personnages.`);
  console.log(`[bot] Wiki : ${WIKI_URL}${BOT_SYNC_SECRET ? "" : " (lecture seule : BOT_SYNC_SECRET absent)"}`);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Changement de rôle : c'est le cas le plus fréquent, et le plus utile.
  if (oldMember.roles.cache.size === newMember.roles.cache.size) {
    const same =
      [...newMember.roles.cache.keys()].sort().join(",") ===
      [...oldMember.roles.cache.keys()].sort().join(",");
    if (same) return;
  }

  const liens = liensForMember(newMember);
  if (liens.length === 0) return;
  await pushToWiki(liens, `rôle modifié pour ${newMember.displayName}`);
});

client.on("guildMemberAdd", async (member) => {
  const liens = liensForMember(member);
  if (liens.length === 0) return;
  await pushToWiki(liens, `${member.displayName} a rejoint le serveur`);
});

/** Commande !wiki <personne> : donne le lien vers la page du personnage. */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Surveillance des salons de parti : on ne réagit pas au texte, seulement
  // au fait qu'il y a une activité nouvelle à analyser.
  const salonSuivi = WATCHED_CHANNELS.find((item) => item.id === message.channelId);
  if (salonSuivi) {
    if ((message.content ?? "").trim().length >= 25) {
      await signalerSalon(message.channel, "nouveau message");
    }
    return;
  }

  if (!/^!wiki\b/i.test(message.content)) return;

  const target = message.content.replace(/^!wiki\b/i, "").trim();
  if (!target) {
    await message.reply("Usage : `!wiki <nom>` — par exemple `!wiki esto`.");
    return;
  }

  const character = nameToCharacter.get(normalize(target));
  if (!character) {
    await message.reply(
      `Personnage « ${target} » inconnu de la configuration partagée (` +
        roster.personnages.map((item) => item.nom).join(", ") +
        ").",
    );
    return;
  }
  await message.reply(`${character.nom} — ${WIKI_URL}/wiki/${character.slug}`);
});

const token = process.env.DISCORD_BOT_TOKEN ?? "";
if (!token) {
  console.error("DISCORD_BOT_TOKEN absent : le bot ne peut pas démarrer.");
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error("[bot] Connexion impossible :", error.message);
  process.exit(1);
});
