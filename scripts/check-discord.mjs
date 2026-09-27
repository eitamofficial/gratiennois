/**
 * Diagnostic de la configuration Discord.
 *
 *   node scripts/check-discord.mjs
 *
 * Lit le fichier .env, puis teste la configuration sans rien écrire :
 *   1. Le token est-il valide ?            (GET /users/@me)
 *   2. Le bot est-il dans le serveur ?     (GET /guilds/{id})
 *   3. Le Server Members Intent est-il actif ? (GET /guilds/{id}/members)
 *   4. Les rôles sont-ils lisibles ?       (GET /guilds/{id}/roles)
 *
 * Code de sortie : 0 = tout est prêt, 1 = configuration à corriger.
 */
import { readFile } from "node:fs/promises";

const API = "https://discord.com/api/v10";

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)?\s*$/.exec(line);
    if (!match) continue;
    let value = (match[2] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const ok = (message) => console.log(`  ✅ ${message}`);
const ko = (message) => console.log(`  ❌ ${message}`);
const info = (message) => console.log(`  ℹ️  ${message}`);
const step = (title) => console.log(`\n${title}`);

let env = {};
try {
  env = parseEnv(await readFile(".env", "utf8"));
} catch {
  console.error("Fichier .env introuvable : copiez .env.example vers .env puis remplissez-le.");
  process.exit(1);
}

const token = (env.DISCORD_BOT_TOKEN ?? "").trim();
const guildId = (env.DISCORD_GUILD_ID ?? "").trim();

let failed = false;

if (!token || !guildId) {
  step("Configuration");
  if (!token) ko("DISCORD_BOT_TOKEN absent du .env");
  if (!guildId) ko("DISCORD_GUILD_ID absent du .env");
  console.log(`
Étapes à suivre :
  1. https://discord.com/developers/applications → Create New Application
  2. Onglet "Bot" → "Reset Token" → copiez-le dans DISCORD_BOT_TOKEN
  3. Onglet "Bot" → activez "SERVER MEMBERS INTENT"
  4. Onglet "OAuth2" → URL Generator → scope "bot" + permission
     "View Server Members" → ouvrez le lien pour inviter le bot
  5. Discord : Paramètres → Paramètres avancés → Mode développeur, puis
     clic droit sur le serveur → "Copier l'identifiant du serveur"
     → collez-le dans DISCORD_GUILD_ID
`);
  process.exit(1);
}

const call = async (path) => {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};

step("1. Token du bot");
const me = await call("/users/@me");
if (me.status === 401) {
  ko("Token invalide (401) — regénérez-en un depuis l'onglet Bot.");
  failed = true;
} else if (me.status === 200) {
  ok(`Token valide — bot : ${me.body.username}#${me.body.discriminator ?? "0"} (${me.body.id})`);
} else {
  ko(`Réponse inattendue (${me.status}).`);
  failed = true;
}

step("2. Accès au serveur");
const guild = await call(`/guilds/${guildId}?with_counts=true`);
if (guild.status === 404) {
  ko(
    `Serveur introuvable (404) — vérifiez DISCORD_GUILD_ID (actuellement ${guildId}) et que le bot a bien été invité dans ce serveur.`,
  );
  failed = true;
} else if (guild.status === 200) {
  const approx = guild.body.approximate_member_count ?? "inconnu";
  const online = guild.body.approximate_presence_count ?? "inconnu";
  ok(`${guild.body.name} — ${approx} membres, ${online} en ligne`);
} else if (guild.status === 403) {
  ko("Accès refusé (403) — le bot n'a pas la permission de voir le serveur.");
  failed = true;
} else {
  ko(`Réponse inattendue (${guild.status}).`);
  failed = true;
}

step("3. Server Members Intent");
const members = await call(`/guilds/${guildId}/members?limit=5`);
if (members.status === 200) {
  ok(`Liste des membres lisible (${members.body.lengthreturned ?? members.body.length} renvoyés sur 5).`);
} else if (members.status === 403) {
  ko(
    "Accès refusé (403) — activez « SERVER MEMBERS INTENT » dans l'onglet Bot du portail développeur, puis relancez.",
  );
  info("Sans cet intent, la page /personnalites ne pourra pas afficher les profils.");
  failed = true;
} else {
  ko(`Réponse inattendue (${members.status}).`);
  failed = true;
}

step("4. Rôles du serveur");
const roles = await call(`/guilds/${guildId}/roles`);
if (roles.status === 200) {
  ok(`${roles.body.length} rôles lisibles (${roles.body
    .slice(0, 6)
    .map((role) => role.name)
    .join(", ")}${roles.body.length > 6 ? "…" : ""}).`);
} else {
  ko(`Réponse inattendue (${roles.status}).`);
  failed = true;
}

step("Résultat");
if (failed) {
  console.log("  ❌ Configuration incomplète — corrigez les points ci-dessus.\n");
  process.exit(1);
}
console.log("  ✅ Configuration valide. Relancez la synchronisation depuis /admin → Synchroniser maintenant.\n");
