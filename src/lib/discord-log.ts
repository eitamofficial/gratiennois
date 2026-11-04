/**
 * Journal Discord — chaque événement du wiki recopié dans un salon.
 *
 * ## Pourquoi passer par l'API du bot plutôt que par le bot lui-même
 *
 * Le bot est un processus séparé, qui peut être arrêté, redémarré ou planté sans
 * que le wiki le sache. Lui déléguer l'envoi reviendrait à perdre précisément
 * les événements qu'on veut tracer : ceux qui se produisent quand quelque chose
 * ne va pas. Le wiki écrit donc directement dans le salon, avec le jeton du bot
 * qu'il possède déjà.
 *
 * ## Ce que le journal ne fait jamais
 *
 * Il ne bloque pas la requête. Un salon Discord lent, saturé ou supprimé ne doit
 * pas empêcher quelqu'un d'enregistrer un article : l'envoi est mis en file,
 * tenté en arrière-plan, et un échec est avoué dans la console du serveur — pas
 * dans la réponse HTTP.
 *
 * Les messages sont espacés de `DELAI_ENTRE_ENVOIS_MS`. Discord limite les bots
 * à cinq messages par cinq secondes et par salon : une rafale de modifications
 * (une restauration qui réécrit plusieurs pages) dépasserait la limite et ferait
 * perdre des lignes. L'espacement les étale au lieu de les perdre.
 */

const DISCORD_API = "https://discord.com/api/v10";
const DELAI_ENTRE_ENVOIS_MS = 900;
const MAX_EN_ATTENTE = 40;
const TIMEOUT_MS = 6000;

/** Salon de journalisation, surchargeable par l'environnement. */
const SALON_PAR_DEFAUT = "1566574511833350144";

export interface LogField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface LogEmbed {
  title: string;
  description?: string;
  fields: LogField[];
  color: number;
}

/** Couleurs d'embed, choisies pour rester lisibles en thème sombre. */
export const COULEUR = {
  creation: 0x30a46c,
  modification: 0xd4af37,
  suppression: 0xe5484d,
  connexion: 0x4a90d9,
  refus: 0xe5484d,
  neutre: 0x8b8d98,
} as const;

const file: LogEmbed[] = [];
let enCours = false;

function tronquer(value: string, max: number): string {
  const propre = value.replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre || "—";
  return `${propre.slice(0, max - 1)}…`;
}

function salon(): string {
  return process.env.DISCORD_LOG_CHANNEL_ID?.trim() || SALON_PAR_DEFAUT;
}

function jeton(): string {
  return process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
}

/** Construit la charge utile Discord à partir d'un embed maison. */
function payload(embed: LogEmbed): unknown {
  return {
    username: "Wiki de Gratianopolis",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: tronquer(embed.title, 256),
        description: embed.description ? tronquer(embed.description, 3800) : undefined,
        color: embed.color,
        fields: embed.fields.slice(0, 25).map((field) => ({
          name: tronquer(field.name, 256),
          value: tronquer(field.value, 1000),
          inline: field.inline ?? true,
        })),
        footer: { text: "Journal du wiki · IIIe Delphinat" },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function envoyer(embed: LogEmbed): Promise<void> {
  const token = jeton();
  const channel = salon();
  if (!token || !channel) return;

  try {
    const response = await fetch(`${DISCORD_API}/channels/${channel}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload(embed)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[journal-discord] HTTP ${response.status} — ${detail.slice(0, 200)}`,
      );
    }
  } catch (error) {
    console.error(
      "[journal-discord] envoi impossible :",
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Vide la file, un message à la fois, avec un intervalle entre chaque. */
async function vider(): Promise<void> {
  if (enCours) return;
  enCours = true;

  try {
    while (file.length > 0) {
      const suivant = file.shift();
      if (suivant) await envoyer(suivant);
      if (file.length > 0) {
        await new Promise((resoudre) => setTimeout(resoudre, DELAI_ENTRE_ENVOIS_MS));
      }
    }
  } finally {
    enCours = false;
  }
}

/**
 * Met un message en file. Ne lève jamais, ne bloque jamais : l'appelant n'a pas
 * à savoir si Discord est joignable.
 */
export function journaliser(embed: LogEmbed): void {
  if (!jeton()) return;

  // Au-delà du plafond, on retire les plus anciens : en cas de panne prolongée
  // de Discord, mieux vaut perdre le début de la rafale que saturer la mémoire
  // du serveur.
  if (file.length >= MAX_EN_ATTENTE) file.splice(0, file.length - MAX_EN_ATTENTE + 1);

  file.push(embed);
  void vider();
}

/** Vrai si le journal Discord est configuré (jeton présent). */
export function journalConfigured(): boolean {
  return Boolean(jeton());
}
