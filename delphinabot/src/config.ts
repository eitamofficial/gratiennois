/**
 * Configuration de DelphinaBot.
 *
 * Tout ce que le bot peut régler sans redémarrage vit dans la base
 * (table `delphinabot_serveurs`) ; ce fichier ne contient que ce qui est lié à
 * la machine ou au compte : le jeton, la base, les chemins d'exécutables.
 *
 * La lecture est volontairement stricte. Un bot de modération qui démarre à
 * moitié configuré est pire qu'un bot qui refuse de démarrer : il donne
 * l'illusion de modérer alors qu'il ne le fait pas. On échoue donc tout de
 * suite, avec un message qui nomme la variable fautive.
 */

import { RACINE } from "./env.js";

/** Niveaux de journalisation, du plus bavard au plus discret. */
export type NiveauLog = "debug" | "info" | "warn" | "error";

export interface Configuration {
  /** Jeton du bot, jamais journalisé. */
  jeton: string;
  /** Identifiant de l'application, pour le déploiement des commandes. */
  clientId: string;
  /** Serveur de référence, pour un déploiement instantané des commandes. */
  guildId: string | null;
  /** Base PostgreSQL partagée avec le wiki. */
  databaseUrl: string;
  /** Racine publique du wiki. */
  wikiUrl: string;
  /** Secret HMAC partagé avec le wiki. */
  secretSync: string;
  /** Membres autorisés à tout, y compris ce que Discord ne permet pas. */
  proprietaires: Set<string>;
  /** Rôles de repli, quand un serveur n'a pas encore été configuré. */
  roles: {
    admin: string | null;
    moderation: string | null;
    mute: string | null;
    dj: string | null;
  };
  /** Préfixe des commandes textuelles. */
  prefixe: string;
  /** Exécutables de la musique. */
  chemins: {
    ffmpeg: string;
    ytdlp: string;
  };
  niveauLog: NiveauLog;
  /** Durée maximale d'une musique, en millisecondes. */
  dureeMusiqueMax: number;
  /** Nombre de messages par jour et par membre qui rapportent de l'XP. */
  messagesParJourXp: number;
}

/** Erreur de configuration : message directement lisible par un humain. */
export class ErreurConfiguration extends Error {}

function lire(cle: string): string | null {
  const valeur = process.env[cle]?.trim();
  return valeur ? valeur : null;
}

function lireObligatoire(cle: string): string {
  const valeur = lire(cle);
  if (!valeur) {
    throw new ErreurConfiguration(
      `La variable ${cle} est absente. Copiez delphinabot/.env.example en ` +
        "delphinabot/.env et renseignez-la, puis relancez le bot.",
    );
  }
  return valeur;
}

function lireNombre(cle: string, defaut: number, minimum = 0): number {
  const brut = lire(cle);
  if (!brut) return defaut;
  const valeur = Number(brut);
  if (!Number.isFinite(valeur) || valeur < minimum) {
    throw new ErreurConfiguration(
      `La variable ${cle} doit être un nombre supérieur ou égal à ${minimum} (valeur reçue : ${brut}).`,
    );
  }
  return valeur;
}

function lireListe(cle: string): Set<string> {
  const brut = lire(cle);
  if (!brut) return new Set();
  return new Set(
    brut
      .split(/[\s,]+/)
      .map((element) => element.trim())
      .filter(Boolean),
  );
}

function lireNiveauLog(): NiveauLog {
  const brut = lire("NIVEAU_LOG")?.toLowerCase();
  if (brut === "debug" || brut === "warn" || brut === "error" || brut === "info") return brut;
  return "info";
}

/** Racine du wiki, sans barre oblique finale. */
function wikiUrl(): string {
  return (lire("WIKI_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Lit et valide l'environnement. À appeler une fois, au démarrage. */
export function lireConfiguration(): Configuration {
  return {
    jeton: lireObligatoire("DISCORD_BOT_TOKEN"),
    clientId: lireObligatoire("DISCORD_CLIENT_ID"),
    guildId: lire("DISCORD_GUILD_ID"),
    databaseUrl: lireObligatoire("DATABASE_URL"),
    wikiUrl: wikiUrl(),
    secretSync: lire("BOT_SYNC_SECRET") ?? "",
    proprietaires: lireListe("PROPRIETAIRES_IDS"),
    roles: {
      admin: lire("ROLE_ADMIN_ID"),
      moderation: lire("ROLE_MODERATION_ID"),
      mute: lire("ROLE_MUTE_ID"),
      dj: lire("ROLE_DJ_ID"),
    },
    prefixe: lire("PREFIXE") ?? "!",
    chemins: {
      ffmpeg: lire("CHEMIN_FFMPEG") ?? "ffmpeg",
      ytdlp: lire("CHEMIN_YTDLP") ?? "yt-dlp",
    },
    niveauLog: lireNiveauLog(),
    dureeMusiqueMax: lireNombre("DUREE_MUSIQUE_MAX", 180, 1) * 60_000,
    messagesParJourXp: lireNombre("MESSAGES_PAR_JOUR_XP", 100, 1),
  };
}

/** Emplacement du dossier de ressources (questions de quiz, marché, citations). */
export const DOSSIER_RESSOURCES = `${RACINE}/ressources`;
