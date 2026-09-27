/**
 * Client **Gemini** (Google Generative AI), sans dépendance externe.
 *
 * Le wiki n'installe aucun SDK : tout passe par `fetch` sur
 * `generativelanguage.googleapis.com`. Une dépendance de plus pour un simple
 * appel HTTP serait un risque de sécurité et de mise à jour inutile.
 *
 * ## Pourquoi l'IA ne publie rien
 *
 * Ce module ne sait qu'une chose : poser une question et lire une réponse. Il
 * ne dispose d'aucun droit d'écriture. Une rédaction automatique ne devient un
 * article qu'après validation dans l'espace d'édition
 * (`src/lib/ai/analyse.ts`).
 *
 * ## Robustesse
 *
 * Gemini renvoie du texte, pas toujours du JSON valide : une réponse peut être
 * enlisée dans des ```json,<think> ou suivie d'un commentaire. `extractJson`
 * isole le premier objet JSON équilibré, sans bibliothèque externe, en
 * respectant les accolades **à l'intérieur** des chaînes — c'est là que les
 * expressions régulières naïves échouent le plus souvent.
 */

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

/** Limite de débit : une requête par cette fenêtre, par cible. */
const MIN_INTERVAL_MS = 1500;

/** Délai maximal d'une requête. */
const TIMEOUT_MS = 45_000;

const dernierAppelParCible = new Map<string, number>();

export function getGeminiConfig(): { apiKey: string; model: string; endpoint: string } {
  return {
    apiKey: (process.env.GEMINI_API_KEY ?? "").trim(),
    model: (process.env.GEMINI_MODEL ?? "").trim() || DEFAULT_MODEL,
    endpoint: (process.env.GEMINI_ENDPOINT ?? "").trim() || DEFAULT_ENDPOINT,
  };
}

export function isGeminiConfigured(): boolean {
  return getGeminiConfig().apiKey.length > 0;
}

/** Attente glissante : deux appels rapprochés ne se marchent pas dessus. */
function attendreSonTour(cible: string): Promise<void> {
  const dernier = dernierAppelParCible.get(cible) ?? 0;
  const ecart = Date.now() - dernier;
  const attente = Math.max(0, MIN_INTERVAL_MS - ecart);
  dernierAppelParCible.set(cible, Date.now() + attente);
  return new Promise((resolve) => setTimeout(resolve, attente));
}

export interface GeminiOptions {
  /** Température : basse par défaut, on veut de la fidélité au texte, pas de la créativité. */
  temperature?: number;
  /** Longueur maximale de la réponse. */
  maxOutputTokens?: number;
  /** Identifiant servant à espacer les appels (le nom de la page visée, par exemple). */
  cible?: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly statut?: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/**
 * Extrait le premier objet JSON équilibré d'une réponse en texte libre.
 *
 * Gère les ```json, les thoughts `<think>`, et les accolades placées dans des
 * chaînes. Renvoie `null` si aucun objet complet n'est présent.
 */
export function extractJson(texte: string): unknown {
  const sansBruit = texte
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  for (let i = 0; i < sansBruit.length; i += 1) {
    if (sansBruit[i] !== "{") continue;

    let profondeur = 0;
    let enChaine = false;
    let echappe = false;

    for (let j = i; j < sansBruit.length; j += 1) {
      const caractere = sansBruit[j];

      if (enChaine) {
        if (echappe) {
          echappe = false;
        } else if (caractere === "\\") {
          echappe = true;
        } else if (caractere === '"') {
          enChaine = false;
        }
        continue;
      }

      if (caractere === '"') enChaine = true;
      else if (caractere === "{") profondeur += 1;
      else if (caractere === "}") {
        profondeur -= 1;
        if (profondeur === 0) {
          const tranche = sansBruit.slice(i, j + 1);
          try {
            return JSON.parse(tranche);
          } catch {
            break; // cet objet est tronqué : on essaie le suivant
          }
        }
      }
    }
  }
  return null;
}

/** Demande une réponse texte brute. */
export async function generateText(
  prompt: string,
  options: GeminiOptions = {},
): Promise<string> {
  const { apiKey, model, endpoint } = getGeminiConfig();
  if (!apiKey) {
    throw new GeminiError(
      "GEMINI_API_KEY absent de l'environnement : l'analyse automatique est désactivée.",
    );
  }

  await attendreSonTour(options.cible ?? "global");

  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), TIMEOUT_MS);

  try {
    const reponse = await fetch(
      `${endpoint}/models/${encodeURIComponent(model)}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
          },
        }),
        signal: controleur.signal,
      },
    );

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      throw new GeminiError(
        `Gemini a répondu ${reponse.status}. ${detail.slice(0, 200)}`,
        reponse.status,
      );
    }

    const donnees = (await reponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const texte = donnees.candidates?.[0]?.content?.parts
      ?.map((partie) => partie.text ?? "")
      .join("")
      .trim();

    if (!texte) {
      throw new GeminiError("Gemini a renvoyé une réponse vide.");
    }
    return texte;
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new GeminiError(`Gemini n'a pas répondu en ${TIMEOUT_MS / 1000} s.`);
    }
    throw new GeminiError(
      `Appel à Gemini impossible : ${(error as Error).message}`,
    );
  } finally {
    clearTimeout(minuteur);
  }
}

/**
 * Demande un objet JSON.
 *
 * On exige explicitement du JSON dans l'instruction **et** on nettoie la
 * réponse : un modèle peut surroundsortir la donnée de ```json, ou l'accompagner
 * d'un commentaire.
 */
export async function generateJson<T>(
  prompt: string,
  options: GeminiOptions = {},
): Promise<T> {
  const complet = `${prompt.trim()}

Réponds **uniquement** par un objet JSON valide, sans texte autour, sans
commentaire et sans bloc de code.`;

  const brut = await generateText(complet, options);
  const donnees = extractJson(brut);

  if (donnees === null || typeof donnees !== "object") {
    throw new GeminiError(
      `Gemini n'a pas renvoyé de JSON exploitable. Début de réponse : ${brut.slice(0, 160)}`,
    );
  }
  return donnees as T;
}
