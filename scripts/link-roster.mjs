#!/usr/bin/env node
/**
 * Rattachement de la configuration partagée aux membres réels du serveur.
 *
 * C'est le script qui **remplit** `shared/roster.json` : pour chaque personnage
 * déclaré (Eitam, Selios, Esto, Bougre, Swaylo, Baron…), il cherche le membre
 * du serveur qui lui correspond et écrit son identifiant dans le fichier
 * partagé. C'est ce qui permet ensuite :
 *
 *   - au wiki d'afficher la bonne photo de profil dans les encadrés ;
 *   - au bot de rattacher un rôle à la bonne page.
 *
 * Le rapprochement se fait **par le nom et les alias déclarés** dans la
 * configuration — jamais par guess. Un personnage sans correspondance est
 * simplement laissé vide et signalé : le wiki affichera alors l'encadré sans
 * portrait plutôt qu'un portrait qui serait le mauvais.
 *
 * Prérequis (dans .env) : DISCORD_BOT_TOKEN et DISCORD_GUILD_ID.
 *
 * Usage :
 *   node scripts/link-roster.mjs          # simulation : affiche le résultat
 *   node scripts/link-roster.mjs --write  # écrit réellement shared/roster.json
 *
 * Le jeton n'est jamais écrit sur le disque.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROSTER_FILE = path.join(ROOT, "shared", "roster.json");
const DISCORD_API = "https://discord.com/api/v10";
const WRITE = process.argv.includes("--write") || process.argv.includes("-w");

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

/** Même normalisation que le wiki et le bot : sans accents, en minuscules. */
function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Noms effectivement portés par un membre sur le serveur.
 * L'API REST place l'utilisateur sous `member.user` : le pseudo, le nom global.
 * Le surnom du serveur (`nick`) est à la racine.
 */
function memberNames(member) {
  return [member.user?.username, member.user?.global_name, member.nick]
    .filter((value) => typeof value === "string" && value.trim())
    .map(normalize);
}

/**
 * Un membre correspond s'il porte **exactement** un des noms ou alias déclarés
 * pour le personnage. Aucune correspondance approximative n'est retenue : deux
 * membres peuvent se ressembler, et rattacher le mauvais portrait serait pire
 * que de n'en mettre aucun.
 */
function isExactMatch(character, member) {
  return matchingName(character, member) !== null;
}

/**
 * Nom porté par le membre qui correspond au personnage, ou `null`.
 *
 * On renvoie le nom **effectivement trouvé**, pas seulement un booléen : un
 * membre s'appelle souvent `pseudo` sur Discord tout en affichant `Capy`
 * comme nom global. Sans cette précision, le rapport affichait un identifiant
 * qui ne ressemblait en rien au personnage, et la lecture pouvait faire croire
 * à une fausse correspondance.
 */
function matchingName(character, member) {
  const wanted = new Set([character.nom, ...(character.aliases ?? [])].map(normalize));
  return memberNames(member).find((name) => wanted.has(name)) ?? null;
}

/** Libellé lisible d'un membre : « pseudo (nom global) ». */
function memberLabel(member) {
  const pseudo = member.user?.username ?? "?";
  const global = member.user?.global_name;
  return global && global !== pseudo ? `${pseudo} (« ${global} »)` : pseudo;
}

/** Suggestions : membres dont le nom contient celui du personnage. */
function suggestionsFor(character, members) {
  const wanted = new Set([character.nom, ...(character.aliases ?? [])].map(normalize));
  return members.filter((member) =>
    memberNames(member).some((name) => [...wanted].some((needle) => needle.length >= 4 && name.includes(needle))),
  );
}

async function main() {
  await loadEnv();
  const token = (process.env.DISCORD_BOT_TOKEN ?? "").trim();
  const guildId = (process.env.DISCORD_GUILD_ID ?? "").trim();

  if (!token || !guildId) {
    console.log("DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID absent : rattachement impossible.");
    console.log("Ajoutez ces deux variables dans .env, puis relancez ce script.");
    process.exit(0);
  }

  const raw = await readFile(ROSTER_FILE, "utf8");
  const roster = JSON.parse(raw);

  // Liste des membres du serveur, avec leurs pseudos, noms globaux et surnoms.
  const response = await fetch(`${DISCORD_API}/guilds/${guildId}/members?limit=1000`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!response.ok) {
    console.error(`API Discord : HTTP ${response.status}.`);
    process.exit(1);
  }

  const members = await response.json();
  console.log(`Membres du serveur : ${members.length}`);
  console.log(`Personnages déclarés : ${roster.personnages.length}\n`);

  let changed = 0;
  for (const character of roster.personnages) {
    // Un identifiant déjà connu est vérifié, pas écrasé : on ne remplace jamais
    // un rattachement validé à la légère.
    if (character.discordUserId) {
      const still = members.find((member) => member.user.id === character.discordUserId);
      if (still) {
        console.log(`  ${character.nom} : déjà rattaché (${character.discordUserId}) ✓`);
      } else {
        console.log(
          `  ${character.nom} : identifiant ${character.discordUserId} introuvable ` +
            "sur le serveur — laissez-le ou effacez-le ?",
        );
      }
      continue;
    }

    // Correspondances multiples : on ne tranche pas à la place du rédacteur.
    const matches = members.filter((member) => isExactMatch(character, member));
    if (matches.length === 0) {
      const suggestions = suggestionsFor(character, members);
      console.log(`  ${character.nom} : aucun membre ne porte exactement ce nom → laissé vide`);
      if (suggestions.length > 0) {
        console.log(
          "      correspondance(s) possible(s) : " +
            suggestions.map((member) => memberLabel(member)).join(", "),
        );
        console.log(
          "      → ajoutez le pseudo exact dans les alias de shared/roster.json," +
            " ou renseignez discordUserId à la main.",
        );
      }
      continue;
    }
    if (matches.length > 1) {
      console.log(
        `  ${character.nom} : ${matches.length} membres portent ce nom ` +
          `(${matches.map((member) => memberLabel(member)).join(", ")}) → ambigu, laissé vide`,
      );
      console.log("      → renseignez discordUserId à la main dans shared/roster.json.");
      continue;
    }

    const found = matches[0];
    character.discordUserId = found.user.id;
    changed += 1;
    console.log(
      `  ${character.nom} → ${memberLabel(found)} (${found.user.id})`,
    );
  }

  if (changed === 0) {
    console.log("\nAucun changement à écrire.");
    return;
  }

  if (!WRITE) {
    console.log(`\n${changed} rattachement(s) trouvé(s) — relancez avec --write pour les enregistrer.`);
    return;
  }

  await writeFile(ROSTER_FILE, `${JSON.stringify(roster, null, 2)}\n`, "utf8");
  console.log(`\n${changed} rattachement(s) enregistrés dans shared/roster.json.`);
  console.log("Relancez ensuite : npm run cache:avatars (portraits de repli) et /admin → synchroniser.");
}

main().catch((error) => {
  console.error("Échec du rattachement :", error instanceof Error ? error.message : error);
  process.exit(1);
});
