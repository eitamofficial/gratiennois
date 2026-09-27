import { getDiscordConfig, isDiscordConfigured } from "@/lib/discord";

/**
 * Lecture des **salons de parti** sur le serveur Discord.
 *
 * C'est la source de l'apprentissage automatique : les débats de ces trois
 * salons sont le matériau qui permet de tenir à jour les pages des partis, de
 * la crise politique et de l'histoire récente.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne publie rien et ne devine rien : il collecte des messages et les
 * rend propres. La transformation en proposition est le travail de
 * `analyse.ts`, et la publication reste humaine.
 *
 * ## Propreté du corpus
 *
 * Un salon Discord est un espace bavard : on y trouve des réactions, des
 * messages vides, des blagues, des pièces jointes. Ce module :
 *
 *   - écarte les messages vides, les réactions et les pièces jointes seules ;
 *   - **coupe** chaque message à une longueur raisonnable, pour qu'un paste
 *     de dix mille caractères ne domine pas l'analyse ;
 *   - retire les mentions `@everyone` et les identifiants d'utilisateurs, qui
 *     n'apportent rien au contenu et sont des données personnelles ;
 *   - ne conserve que le **nom d'affichage**, jamais l'identifiant, dans le
 *     texte transmis à Gemini.
 */

/** Les trois salons suivis, tels que définis par la direction du Delphinat. */
export interface WatchedChannel {
  id: string;
  /** Rappelé à l'IA : chaque message est rattaché à son parti. */
  libelle: string;
  /** Page du wiki que ce salon alimente en priorité. */
  articleSlug: string;
}

export const WATCHED_CHANNELS: readonly WatchedChannel[] = [
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
] as const;

/**
 * Nombre de messages récupérés par salon.
 *
 * L'API Discord refuse `limit` supérieur à 100 sur la lecture d'historique et
 * répond alors 400. La valeur doit rester dans cette borne.
 */
const PAR_SALON = 100;

/** Longueur maximale d'un message conservé, en caractères. */
const LONGUEUR_MAX = 600;

export interface CorpusMessage {
  channelId: string;
  salon: string;
  auteur: string;
  texte: string;
  horodatage: string;
}

export interface CorpusChannel {
  channel: WatchedChannel;
  messages: CorpusMessage[];
  /** Le salon est-il lisible par le robot ? */
  lisible: boolean;
  erreur?: string;
}

/** Nettoie un message brut de l'API Discord. */
function nettoyer(texte: string): string {
  return texte
    .replace(/<@!?\d+>/g, "") // mentions d'utilisateurs
    .replace(/<@&\d+>/g, "") // mentions de rôle
    .replace(/@everyone|@here/g, "")
    .replace(/<a?:\w+:\d+>/g, "") // emojis
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // liens Markdown
    .replace(/https?:\/\/\S+/g, "lien")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LONGUEUR_MAX);
}

function estExploitable(message: { content?: string }): boolean {
  const texte = nettoyer(message.content ?? "");
  // Une pièce jointe ou un habillage ne fait jamais disparaître le texte : la
  // « Fiche de parti » des trois partis est un message **de webhook** qui
  // porte une illustration. La rejeter sur la présence d'une pièce jointe
  // revenait à perdre la seule information réellement utile du salon.
  return texte.length >= 25;
}

/**
 * Un message est-il d'un compte automatique sans valeur ?
 *
 * Attention : les fiches de parti sont publiées par des **webhooks**, et
 * Discord les marque `bot: true`. Ce sont précisément les documents officiels
 * des partis. On ne retire donc que les vrais comptes de robots — ceux qui
 * n'ont pas de `webhook_id`.
 */
function estRobotNonOfficiel(message: {
  author?: { bot?: boolean };
  webhook_id?: string | null;
}): boolean {
  if (message.webhook_id) return false;
  return message.author?.bot === true;
}

/**
 * Lit un salon et renvoie ses messages exploitables.
 *
 * Une erreur Discord (salon absent, droits insuffisants) est **rattrapée** et
 * rapportée dans le résultat : l'analyse continue sur les autres salons plutôt
 * que d'échouer en bloc.
 */
async function lireSalon(
  channel: WatchedChannel,
  token: string,
): Promise<CorpusChannel> {
  const url =
    `https://discord.com/api/v10/channels/${channel.id}/messages` +
    `?limit=${PAR_SALON}`;

  try {
    const reponse = await fetch(url, {
      headers: {
        Authorization: `Bot ${token}`,
        // Le CDN et l'API Discord refusent les requêtes sans User-Agent.
        "User-Agent": "wiki-gratianopolis/1.0",
      },
    });

    if (!reponse.ok) {
      return {
        channel,
        messages: [],
        lisible: false,
        erreur: `HTTP ${reponse.status} sur le salon ${channel.libelle}`,
      };
    }

    const bruts = (await reponse.json()) as Array<{
      content?: string;
      author?: { username?: string; global_name?: string; bot?: boolean };
      webhook_id?: string | null;
      timestamp?: string;
      attachments?: unknown[];
      embeds?: unknown[];
    }>;

    const messages = bruts
      .filter((message) => !estRobotNonOfficiel(message))
      .filter(estExploitable)
      .map((message) => ({
        channelId: channel.id,
        salon: channel.libelle,
        auteur:
          message.author?.global_name || message.author?.username || "membre",
        texte: nettoyer(message.content ?? ""),
        horodatage: message.timestamp ?? "",
      }))
      .reverse(); // l'API rend du plus récent au plus ancien

    return { channel, messages, lisible: true };
  } catch (error) {
    return {
      channel,
      messages: [],
      lisible: false,
      erreur: `${channel.libelle} : ${(error as Error).message}`,
    };
  }
}

/** Lit les trois salons de parti. */
export async function lireSalonsDeParti(): Promise<CorpusChannel[]> {
  const { token } = getDiscordConfig();
  if (!isDiscordConfigured() || !token) {
    return WATCHED_CHANNELS.map((channel) => ({
      channel,
      messages: [],
      lisible: false,
      erreur: "DISCORD_BOT_TOKEN ou DISCORD_GUILD_ID absent de l'environnement.",
    }));
  }
  return Promise.all(WATCHED_CHANNELS.map((salon) => lireSalon(salon, token)));
}

/**
 * Met en forme le corpus pour Gemini.
 *
 * Les messages sont regroupés par salon et signés par auteur, et l'on rappelle
 * systématiquement la page wiki visée : sans cette consigne, le modèle
 * tendance à parler du parti « en général » plutôt que de la page à mettre à
 * jour.
 */
export function formaterCorpus(salons: readonly CorpusChannel[]): string {
  const blocs: string[] = [];

  for (const salon of salons) {
    if (!salon.lisible || salon.messages.length === 0) continue;

    const lignes = salon.messages
      .map((message) => `- [${message.auteur}] ${message.texte}`)
      .join("\n");

    blocs.push(
      `### Salon « ${salon.channel.libelle} » ` +
        `(${salon.messages.length} messages, page wiki visée : ${salon.channel.articleSlug})\n` +
        lignes,
    );
  }

  return blocs.join("\n\n");
}

/** Volume total de messages collectés. */
export function volumeDuCorpus(salons: readonly CorpusChannel[]): number {
  return salons.reduce((total, salon) => total + salon.messages.length, 0);
}
