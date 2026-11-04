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
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROSTER_FILE = join(HERE, "..", "shared", "roster.json");

// Fenêtre de validité des signatures reçues (doit rester alignée avec le wiki).
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Chargement de l'environnement local
// ---------------------------------------------------------------------------

const ENV_KEYS = [
  "DISCORD_BOT_TOKEN",
  "WIKI_URL",
  "BOT_SYNC_SECRET",
  "GUILD_ID",
];

const ENV_KEY_SET = new Set(ENV_KEYS);

/**
 * Charge un fichier `.env` local sans dépendance externe.
 *
 * Règles simples et explicites :
 *   - seules les variables connues sont chargées ;
 *   - le jeton ne peut jamais être surchargé s'il est déjà dans l'environnement ;
 *   - les valeurs entre guillemets sont déguillotées ;
 *   - les lignes vide ou mal formée sont ignorées sans erreur.
 */
function loadEnv() {
  const file = join(HERE, ".env");
  if (!existsSync(file)) return;

  const text = readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^[A-Za-z_][A-Za-z0-9_]*\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;

    const key = match[0].slice(0, match[0].indexOf("=")).trim();
    if (!ENV_KEY_SET.has(key)) continue;

    const rawValue = match[1].trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

    if (key === "DISCORD_BOT_TOKEN") {
      if (process.env[key]) continue;
    }

    process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Chargement du roster partagé
// ---------------------------------------------------------------------------

/** Forme attendue d'un personnage dans shared/roster.json.
 *  { slug, nom, discordUserId, aliases, roles, charge, actif }
 */
function isValidRosterCharacter(record) {
  if (typeof record !== "object" || record === null) return false;
  if (typeof record.slug !== "string" || record.slug.trim() === "") return false;
  if (typeof record.nom !== "string" || record.nom.trim() === "") return false;
  if (!Array.isArray(record.roles)) return false;
  if (!Array.isArray(record.aliases)) return false;
  return true;
}

function loadRoster() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(ROSTER_FILE, "utf8"));
  } catch (error) {
    console.error(`[bot] ${ROSTER_FILE} est illisible :`, error && error.message);
    process.exit(1);
  }

  if (!raw || typeof raw !== "object") {
    console.error(`[bot] ${ROSTER_FILE} ne contient rien de lisible.`);
    process.exit(1);
  }

  const version =
    typeof raw.version === "number" && Number.isFinite(raw.version)
      ? raw.version
      : 1;

  const personnages = [];
  const candidates = Array.isArray(raw.personnages) ? raw.personnages : [];
  for (const item of candidates) {
    if (!isValidRosterCharacter(item)) {
      console.warn(
        `[bot] ${ROSTER_FILE} : entrée de personnage ignorée (champ obligatoire manquant).`,
      );
      continue;
    }
    const record = item;
    personnages.push({
      slug: record.slug.trim(),
      nom: record.nom.trim(),
      discordUserId:
        typeof record.discordUserId === "string" ? record.discordUserId.trim() : "",
      aliases: record.aliases.filter((alias) => typeof alias === "string"),
      roles: record.roles.filter((role) => typeof role === "string"),
      charge:
        typeof record.charge === "string" ? record.charge.trim() : record.nom.trim(),
      actif: record.actif !== false,
    });
  }

  return { version, personnages };
}

// ---------------------------------------------------------------------------
// Normalisation et tables de correspondance
// ---------------------------------------------------------------------------

/** Même normalisation de nom que le wiki : sans accents, en minuscules. */
function normalize(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const roster = loadRoster();

const rawWikiUrl =
  process.env.WIKI_URL?.trim() ?? "http://localhost:3000";

function buildWikiUrl(raw) {
  const cleaned = raw.replace(/\/+$/, "");
  const withScheme = cleaned.startsWith("http://") || cleaned.startsWith("https://")
    ? cleaned
    : `https://${cleaned}`;
  const url = new URL(withScheme);
  return url;
}

const WIKI_URL_OBJECT = process.env.WIKI_URL ? buildWikiUrl(rawWikiUrl) : new URL("http://localhost:3000");
const WIKI_URL = WIKI_URL_OBJECT.origin.replace(/\/+$/, "");
const BOT_SYNC_SECRET = process.env.BOT_SYNC_SECRET?.trim() ?? "";
const GUILD_ID =
  process.env.GUILD_ID?.trim() ?? roster.personnages[0]?.discordUserId ?? "";

/** Table rôle Discord normalisé → personnage du roster. */
const roleToCharacter = new Map();
for (const character of roster.personnages) {
  for (const role of character.roles) {
    roleToCharacter.set(normalize(role), character);
  }
}

/** Table nom/alias normalisé → personnage du roster. */
const nameToCharacter = new Map();
for (const character of roster.personnages) {
  nameToCharacter.set(normalize(character.nom), character);
  for (const alias of character.aliases) {
    nameToCharacter.set(normalize(alias), character);
  }
}

// ---------------------------------------------------------------------------
// Communication sécurisée avec le wiki
// ---------------------------------------------------------------------------

/**
 * Signe un corps avec le secret partagé : HMAC-SHA256 de `horodatage.corps`.
 *
 * Le bot n'envoie pas de requête tant que le secret est absent ; quand il est
 * présent, chaque requête est horodatée et signée comme sur le wiki.
 */
function sign(body, timestamp = String(Date.now())) {
  return createHmac("sha256", BOT_SYNC_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

/**
 * Vérifie que la réponse du wiki est cohérente avec la signature envoyée.
 *
 * Le bot ne se contente pas d'ignorer les erreurs HTTP : il rejette aussi les
 * réponses dont l'horodatage est trop ancien, pour limiter la rejouabilité d'une
 * réponse interceptée.
 */
function validateWikiResponse(status, signature, timestamp) {
  if (!BOT_SYNC_SECRET) return { ok: true };

  if (!signature || !timestamp) {
    return { ok: false, reason: "Réponse du wiki mal formée (signature ou horodatage manquant)." };
  }

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) {
    return { ok: false, reason: "Réponse du wiki : horodatage invalide." };
  }

  if (Math.abs(Date.now() - sent) > SIGNATURE_WINDOW_MS) {
    return { ok: false, reason: "Réponse du wiki : hors fenêtre de validité." };
  }

  const expected = sign("", timestamp);
  const safeEqual = (a, b) => {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  };

  if (!safeEqual(expected, signature)) {
    return { ok: false, reason: "Réponse du wiki : signature invalide." };
  }

  if (!status || status >= 400) {
    return { ok: false, reason: `Réponse du wiki : HTTP ${status}.` };
  }

  return { ok: true };
}

/**
 * Envoie au wiki la liste des rattachements, signée.
 *
 * Sans secret configuré, le bot fonctionne en lecture seule : il journalise
 * ce qu'il détecterait au lieu d'appeler le site.
 */
async function pushToWiki(liens, reason) {
  if (!BOT_SYNC_SECRET) {
    console.warn(`[bot] BOT_SYNC_SECRET absent : ${reason} ignoré.`);
    for (const lien of liens) {
      console.warn(`  - ${lien.slug} → ${lien.discordUserId}`);
    }
    return;
  }

  if (liens.length === 0) return;

  const body = JSON.stringify({
    liens,
    source: "bot",
    rosterVersion: roster.version,
  });
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
      signal: AbortSignal.timeout(8000),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    const check = validateWikiResponse(
      response.status,
      payload.signature ?? null,
      payload.timestamp ?? null,
    );

    if (!check.ok) {
      console.error(`[bot] Wiki a refusé la synchronisation (${reason}) :`, check.reason);
      return;
    }

    console.log(
      `[bot] ${reason} : ${(payload.linked ?? []).length} rattachement(s), ` +
        `${(payload.ignored ?? []).length} ignoré(s).`,
    );
  } catch (error) {
    console.error(`[bot] Wiki injoignable (${reason}) :`, error && error.message);
  }
}

/**
 * Rattachements correspondant aux rôles actuellement portés par un membre.
 */
function liensForMember(member) {
  const liens = [];

  for (const role of member.roles.cache.values()) {
    const character = roleToCharacter.get(normalize(role.name));
    if (!character) continue;
    if (liens.some((lien) => lien.slug === character.slug)) continue;
    liens.push({ slug: character.slug, discordUserId: member.id });
  }

  return liens;
}

// ---------------------------------------------------------------------------
// Surveillance des salons de parti
// ---------------------------------------------------------------------------

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

const WATCHED_CHANNEL_IDS = new Set(WATCHED_CHANNELS.map((channel) => channel.id));

const DELAI_PAR_SALON_MS = 5 * 60 * 1000;

const dernierSignalement = new Map();

const MAX_SIGNAL_PER_WINDOW = 60;
const SIGNAL_WINDOW_MS = 5 * 60 * 1000;

const signauxDansLaFenetre = new Map();

function nettoyerSignaux() {
  const maintenant = Date.now();
  for (const [channelId, entries] of signauxDansLaFenetre) {
    const garde = entries.filter((entry) => maintenant - entry.ts < SIGNAL_WINDOW_MS);
    if (garde.length === 0) {
      signauxDansLaFenetre.delete(channelId);
      continue;
    }
    signauxDansLaFenetre.set(channelId, garde);
  }
}

async function signalerSalon(channel, raison) {
  if (!WIKI_URL) return;

  nettoyerSignaux();

  const dernier = dernierSignalement.get(channel.id) ?? 0;
  if (Date.now() - dernier < DELAI_PAR_SALON_MS) return;
  dernierSignalement.set(channel.id, Date.now());

  const entries = signauxDansLaFenetre.get(channel.id) ?? [];
  if (entries.length >= MAX_SIGNAL_PER_WINDOW) {
    console.warn(
      `[bot] Salon « ${channel.name} » : trop de signalements dans la fenêtre, ignoré.`,
    );
    return;
  }

  entries.push({ ts: Date.now() });
  signauxDansLaFenetre.set(channel.id, entries);

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
      signal: AbortSignal.timeout(8000),
    });

    let payload = {};
    try {
      payload = await reponse.json();
    } catch {
      payload = {};
    }

    if (!reponse.ok || payload.ok !== true) {
      console.error(
        `[bot] Salon « ${channel.name} » signalé mais rejeté — ` +
          (payload.error ?? `HTTP ${reponse.status}`),
      );
      return;
    }

    console.log(`[bot] Salon « ${channel.name} » signalé — HTTP ${reponse.status}.`);
  } catch (error) {
    console.error(`[bot] Signalement impossible (${channel.name}) :`, error && error.message);
  }
}

// ---------------------------------------------------------------------------
// Client Discord
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  // Utile pour que le bot voie les messages des salons qu'il n'a pas en cache.
  partials: [Partials.GuildMember, Partials.Message],
});

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------

client.once("ready", () => {
  console.log(`[bot] Connecté en tant que ${client.user.tag}`);
  console.log(
    `[bot] Configuration partagée v${roster.version} — ${roster.personnages.length} personnage(s).`,
  );
  console.log(
    `[bot] Wiki : ${WIKI_URL}${BOT_SYNC_SECRET ? "" : " (lecture seule : BOT_SYNC_SECRET absent)"}`,
  );
  console.log(`[bot] Serveur cible : ${GUILD_ID || "non précisé"}`);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Ignore les serveurs non ciblés.
  if (GUILD_ID && oldMember.guild?.id !== GUILD_ID) return;

  if (!oldMember.roles || !newMember.roles) return;
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
  if (GUILD_ID && member.guild?.id !== GUILD_ID) return;

  const liens = liensForMember(member);
  if (liens.length === 0) return;
  await pushToWiki(liens, `${member.displayName} a rejoint le serveur`);
});

/** Commande !wiki <personne> : donne le lien vers la page du personnage. */
client.on("messageCreate", async (message) => {
  if (message.author?.bot) return;
  if (!message.guild) return;
  if (GUILD_ID && message.guild.id !== GUILD_ID) return;

  // Surveillance des salons de parti : on ne réagit pas au texte, seulement
  // au fait qu'il y a une activité nouvelle à analyser.
  const salonSuivi =
    WATCHED_CHANNEL_IDS.has(message.channelId)
      ? WATCHED_CHANNELS.find((item) => item.id === message.channelId)
      : null;

  if (salonSuivi) {
    const contenu = message.content ?? "";
    if (contenu.trim().length >= 25) {
      await signalerSalon(message.channel, "nouveau message");
    }
    return;
  }

  if (!/^!wiki\b/i.test(message.content ?? "")) return;

  const target = message.content.replace(/^!wiki\b/i, "").trim();
  if (!target) {
    await message.reply("Usage : `!wiki <nom>` — par exemple `!wiki esto`.");
    return;
  }

  const character = nameToCharacter.get(normalize(target));
  if (!character) {
    const known = roster.personnages.map((item) => item.nom).join(", ");
    await message.reply(
      "Personnage \u00ab " + target + " \u00bb inconnu de la configuration partagee (" + known + ").",
    );
    return;
  }

  await message.reply(character.nom + " — " + WIKI_URL + "/wiki/" + character.slug);
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------

const token = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";

if (!token) {
  console.error("DISCORD_BOT_TOKEN absent : le bot ne peut pas démarrer.");
  process.exit(1);
}

if (BOT_SYNC_SECRET && BOT_SYNC_SECRET.length < 16) {
  console.warn(
    "[bot] BOT_SYNC_SECRET est très court : la signature sera techniquement valide,"
    + " mais peu résistante.",
  );
}

client
  .login(token)
  .catch((error) => {
    console.error("[bot] Connexion impossible :", error && error.message);
    process.exit(1);
  });
