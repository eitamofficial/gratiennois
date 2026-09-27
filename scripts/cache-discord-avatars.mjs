#!/usr/bin/env node
/**
 * Mise en cache local des photos de profil Discord.
 *
 * Le wiki affiche les portraits **en direct** depuis l'API Discord (voir
 * `src/lib/avatar-url.ts`). Ce script prépare le repli : il télécharge chaque
 * avatar connu dans `public/avatars/<id>.<ext>`, afin que l'encadré reste
 * illustré même si l'API est momentanément injoignable ou si la
 * synchronisation n'a jamais été configurée.
 *
 * Chaque image est conservée **dans son format réel** — PNG, JPEG, GIF ou
 * WebP — déduit de ses premiers octets et non de l'extension demandée. Un
 * avatar animé par exemple est un GIF : l'enregistrer sous un nom `.png`
 * produirait un fichier que le navigateur ne peut pas décoder, et le portrait
 * disparaîtrait. `index.json` fait le lien entre l'identifiant Discord et le
 * fichier réellement écrit ; c'est lui que lit `src/lib/avatar-cache.ts`.
 *
 * Il lit la même configuration partagée que le bot et le wiki
 * (`shared/roster.json`), et se base sur les identifiants déjà renseignés
 * ainsi que sur les articles de personnalité du wiki.
 *
 * Prérequis (dans .env) : DISCORD_BOT_TOKEN et DISCORD_GUILD_ID.
 *
 * Usage :
 *   node scripts/cache-discord-avatars.mjs          # met à jour le cache
 *   node scripts/cache-discord-avatars.mjs --dry    # liste sans télécharger
 *
 * Le jeton du bot n'est jamais écrit sur le disque : il n'est lu qu'en mémoire
 * pour l'appel HTTP.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "avatars");
const INDEX_FILE = path.join(OUT_DIR, "index.json");
const DISCORD_API = "https://discord.com/api/v10";
/** Le CDN de Discord refuse les requêtes sans User-Agent (HTTP 403). */
const USER_AGENT = "DiscordBot (https://github.com/gratianopolis/wiki, 1.0)";
const DRY = process.argv.includes("--dry") || process.argv.includes("--dry-run");

/** Charge les variables de .env sans dépendance externe. */
async function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!existsSync(file)) return;
  const raw = await readFile(file, "utf8");
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key]) continue;
    process.env[key] = value.replace(/^["']|["']$/g, "");
  }
}

/**
 * Avatar par défaut d'un compte sans photo : Discord sert une image générée à
 * partir de son identifiant. On la met en cache comme les autres, pour que le
 * repli local soit complet.
 */
/**
 * Format réel d'une image, lu dans ses **premiers octets** (nombre magique).
 *
 * On ne se fie jamais à l'extension de l'URL : le CDN peut renvoyer du PNG là
 * où du GIF était demandé, ou l'inverse. C'est la seule façon de nommer le
 * fichier de façon à ce qu'un navigateur puisse le décoder.
 *
 * @returns l'extension correspondante, ou `null` si ce n'est pas une image
 *   matricielle reconnue (le SVG est volontairement exclu : il peut contenir
 *   du script, et il n'a pas sa place dans une photo de profil).
 */
function detectImageFormat(buffer) {
  if (buffer.length < 12) return null;
  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG : FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  // GIF : "GIF87a" ou "GIF89a"
  if (buffer.subarray(0, 6).toString("latin1") === "GIF87a") return "gif";
  if (buffer.subarray(0, 6).toString("latin1") === "GIF89a") return "gif";
  // WebP : "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function defaultAvatarUrl(userId) {
  const index =
    (BigInt("0x" + BigInt(userId).toString(16).toUpperCase().slice(-12).padStart(12, "0")) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

/** Identifiants Discord à traiter : roster d'abord, articles du wiki ensuite. */
async function collectUserIds() {
  const ids = new Set();

  const rosterPath = path.join(ROOT, "shared", "roster.json");
  if (existsSync(rosterPath)) {
    const roster = JSON.parse(await readFile(rosterPath, "utf8"));
    for (const character of roster.personnages ?? []) {
      if (typeof character.discordUserId === "string" && /^[0-9]{5,25}$/.test(character.discordUserId)) {
        ids.add(character.discordUserId);
      }
    }
  }

  const articlesPath = path.join(ROOT, "data", "articles.json");
  if (existsSync(articlesPath)) {
    const articles = JSON.parse(await readFile(articlesPath, "utf8"));
    for (const article of articles) {
      if (typeof article.discordUserId === "string" && /^[0-9]{5,25}$/.test(article.discordUserId)) {
        ids.add(article.discordUserId);
      }
    }
  }

  return [...ids];
}

async function main() {
  await loadEnv();
  const token = (process.env.DISCORD_BOT_TOKEN ?? "").trim();
  const guildId = (process.env.DISCORD_GUILD_ID ?? "").trim();
  const userIds = await collectUserIds();

  console.log(`Identifiants connus : ${userIds.length}`);

  if (!token || !guildId) {
    console.log("DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID absent : rien à télécharger.");
    console.log("Le wiki fonctionnera, mais sans photo de profil ni repli local.");
    process.exit(0);
  }
  if (userIds.length === 0) {
    console.log("Aucun identifiant : renseignez shared/roster.json ou lancez la synchronisation.");
    process.exit(0);
  }
  if (DRY) {
    console.log("Mode simulation : aucune écriture.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const index = {};
  let downloaded = 0;
  let failed = 0;

  for (const userId of userIds) {
    const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!response.ok) {
      console.log(`  ${userId} : API HTTP ${response.status} (membre absent ou accès refusé)`);
      failed += 1;
      continue;
    }

    const member = await response.json();
    // Deux emplacements possibles, et ils ne se mélangent pas : l'empreinte
    // d'un avatar de serveur n'est valable que sur `/guild-avatars/`, celle d'un
    // avatar de compte uniquement sur `/avatars/`. Utiliser l'une à la place de
    // l'autre donne un 403 — c'est le piège à éviter ici.
    const guildHash = typeof member?.avatar === "string" ? member.avatar : "";
    const userHash = typeof member?.user?.avatar === "string" ? member.user.avatar : "";
    // Discord ne sert une image animée qu'en GIF, et le signale par le préfixe
    // `a_` de l'empreinte. Demander `.png` dans ce cas ne donnerait pas une
    // erreur mais une image figée sur la première image de l'animation.
    const ext = (hash) => (hash.startsWith("a_") ? "gif" : "png");
    const isGuildAvatar = Boolean(guildHash) && /^(a_)?[a-z0-9]{8,64}$/i.test(guildHash);
    const isUserAvatar = Boolean(userHash) && /^(a_)?[a-z0-9]{8,64}$/i.test(userHash);
    const url = isGuildAvatar
      ? `https://cdn.discordapp.com/guild-avatars/${guildId}/${guildHash}.${ext(guildHash)}?size=256`
      : isUserAvatar
        ? `https://cdn.discordapp.com/avatars/${userId}/${userHash}.${ext(userHash)}?size=256`
        : // Compte sans photo : on prend l'avatar par défaut, pour que le
          // repli local reste toujours disponible.
          defaultAvatarUrl(userId);

    const image = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!image.ok) {
      console.log(`  ${userId} : téléchargement impossible (HTTP ${image.status}).`);
      failed += 1;
      continue;
    }

    // On n'écrit que des octets d'image : la réponse est vérifiée avant écriture,
    // et son **format réel** est lu dans les en-têtes, pas déduit de l'URL.
    const buffer = Buffer.from(await image.arrayBuffer());
    const format = detectImageFormat(buffer);
    if (!format || buffer.length < 100 || buffer.length > 2_000_000) {
      console.log(
        `  ${userId} : réponse ignorée (ce n'est pas une image matricielle plausible, ` +
          `${buffer.length} octets).`,
      );
      failed += 1;
      continue;
    }

    const file = `${userId}.${format}`;
    await writeFile(path.join(OUT_DIR, file), buffer);
    // Un portrait re-téléchargé dans un autre format laisse derrière lui un
    // fichier obsolète : on le supprime, sinon `public/avatars/` accumule des
    // portraits périmés que rien ne référence plus.
    for (const stale of await readdir(OUT_DIR)) {
      if (stale.startsWith(`${userId}.`) && stale !== file) {
        await rm(path.join(OUT_DIR, stale), { force: true });
        console.log(`  ${userId} : obsolète ${stale} supprimé.`);
      }
    }
    index[userId] = {
      file,
      format,
      cachedAt: new Date().toISOString(),
      // Source réelle de l'image. Elle ne se déduit pas du seul fait qu'il y ait
      // une empreinte de serveur : celle-ci peut être absente alors que le membre
      // a bien une photo de compte, auquel cas l'annoncer comme « avatar par
      // défaut » était faux.
      source: isGuildAvatar ? "avatar-de-serveur" : userHash ? "avatar-de-compte" : "avatar-par-defaut",
      displayName: member?.nick ?? member?.user?.global_name ?? member?.user?.username ?? userId,
    };
    downloaded += 1;
    console.log(`  ${userId} → public/avatars/${file} (${(buffer.length / 1024).toFixed(0)} Ko)`);
  }

  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf8");
  console.log(`\n${downloaded} photo(s) en cache, ${failed} sans succès.`);
  console.log(`Index écrit dans ${path.relative(ROOT, INDEX_FILE)}.`);
}

main().catch((error) => {
  console.error("Échec de la mise en cache :", error instanceof Error ? error.message : error);
  process.exit(1);
});
