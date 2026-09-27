import { generateJson, GeminiError } from "@/lib/gemini";
import { formaterCorpus, lireSalonsDeParti, volumeDuCorpus, type CorpusChannel } from "./corpus";

/**
 * Moteur d'analyse : transforme les débats des salons de parti en
 * **propositions d'articles**.
 *
 * ## Le principe qui gouverne tout ce fichier
 *
 * L'IA **propose**, l'humain **décide**. Aucune fonction ici n'écrit dans le
 * magasin : `analyserSalons` renvoie des objets, et c'est
 * `src/app/api/ai/analyse/route.ts` qui les enregistre comme articles en état
 * `proposition`, invisibles du site public.
 *
 * Cette séparation n'est pas une précaution de façade. Un modèle qui écrit
 * directement dans les pages peut, sur un message trompeur, y faire figurer une
 * accusation comme un fait établi. Il est donc tenu de :
 *
 *   - ne **déduire aucun fait** qui ne figure pas dans le corpus ;
 *   - **citer** les messages qui justifient chaque affirmation ;
 *   - distinguer ce qui est **avéré** de ce qui est **affirmé** par un membre ;
 *   - rester **muet** plutôt que d'inventer : pas de nouvelle génération, pas
 *     de date inventée, pas de citation reformulée comme une verbatim.
 *
 * Une page qui n'a rien de neuf à dire doit produire `pertinence: false`, et
 * l'analyse s'arrête là. Le silence vaut mieux que la paraphrase.
 */

export interface Proposition {
  /** Slug de la page à mettre à jour. */
  slug: string;
  /** Titre de la page, repris pour l'affichage. */
  titre: string;
  /** L'apport justifie-t-il une relecture humaine ? */
  pertinent: boolean;
  /** Résumé en une phrase, pour la file de validation. */
  resume: string;
  /** Nouveau résumé d'article, à reprendre. */
  resumeArticle: string;
  /** Section à ajouter ou à remplacer, en Markdown, prête à insérer. */
  sectionMarkdown: string;
  /** Messages qui soutiennent la proposition : sans eux, elle est rejetée. */
  citations: string[];
  /** Étiquettes proposées. */
  tags: string[];
  /** Confiance de l'IA, entre 0 et 1. */
  confiance: number;
  /** Raison de l'éventuel refus de répondre. */
  note: string;
}

export interface RapportAnalyse {
  /** Salons effectivement lus. */
  salons: Array<{
    id: string;
    libelle: string;
    lisible: boolean;
    messages: number;
    erreur?: string;
  }>;
  /** Nombre total de messages collectés. */
  volume: number;
  /** Propositions produites, une par page visée. */
  propositions: Proposition[];
  /** Pages où l'IA a estimé qu'il n'y avait rien de neuf. */
  sansApport: string[];
  /** Erreurs rencontrées, salon par salon. */
  erreurs: string[];
  /** Vrai si aucun salon n'a pu être lu. */
  vide: boolean;
}

const INSTRUCTION = `Tu es l'archiviste d'une micronation Discord, le IIIe Delphinat de Gratianopolis. Ton travail consiste à tenir à jour les pages de son wiki à partir des débats de ses salons de parti.

Règles impératives, dans cet ordre :

1. **N'invente rien.** Tout ce que tu affirmes doit se trouver dans les messages fournis. Si une information manque, ne l'écris pas.
2. **Cite.** Chaque affirmation doit s'appuyer sur un message réellement présent dans le corpus. Donne la citation exacte, entre guillemets, avec le nom d'auteur entre crochets, comme dans « [Nom] texte du message ».
3. **Attribue.** Un membre qui affirme quelque chose n'établit pas que c'est vrai : écris que ce membre l'affirme, ou que le parti l'a décidé, quand c'est le cas.
4. **Ne date pas** sauf si le corpus contient une date. Ne traduis pas une opinion en fait établi.
5. **Sobre.** Ton texte est destiné à un article encyclopédique sobre : pas de rhétorique, pas de superlatifs, pas de commentaire moral.
6. **Silence si besoin.** Si le corpus n'apporte rien de neuf pour la page, réponds avec "pertinente": false et n'écris aucune section. C'est une réponse valide et souvent la meilleure.

Retourne un objet JSON de la forme :

{
  "pertinente": true ou false,
  "resume": "une phrase expliquant l'apport",
  "resumeArticle": "le nouveau résumé de l'article, 2 phrases maximum",
  "section": "la section à ajouter, en Markdown, 150 mots maximum",
  "citations": ["[Auteur] extrait exact du message", "…"],
  "tags": ["mot-clé", "…"],
  "confiance": 0.0 à 1.0
}`;

/**
 * Demande à Gemini une proposition de mise à jour pour une page.
 *
 * Toute réponse qui ne respecte pas le format — pas de citations, pas de
 * section, ou une confiance absurde — est **rejetée** : le moteur préfère
 * ne rien proposer plutôt que de proposer n'importe quoi.
 */
async function proposerPourSalon(
  salon: CorpusChannel,
): Promise<Proposition> {
  const base: Proposition = {
    slug: salon.channel.articleSlug,
    titre: salon.channel.articleSlug,
    pertinent: false,
    resume: "",
    resumeArticle: "",
    sectionMarkdown: "",
    citations: [],
    tags: [],
    confiance: 0,
    note: "",
  };

  if (!salon.lisible || salon.messages.length < 5) {
    return { ...base, note: "Salon illisible ou trop peu de messages." };
  }

  const prompt =
    `${INSTRUCTION}\n\n` +
    `Page wiki à mettre à jour : **${salon.channel.articleSlug}**\n` +
    `Salon analysé : **${salon.channel.libelle}**\n\n` +
    "Voici les messages, du plus ancien au plus récent :\n\n" +
    formaterCorpus([salon]);

  let brut: Record<string, unknown>;
  try {
    brut = await generateJson<Record<string, unknown>>(prompt, {
      cible: salon.channel.articleSlug,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return { ...base, note: error.message };
    }
    throw error;
  }

  const pertinent = brut.pertinente === true;

  const citations = Array.isArray(brut.citations)
    ? brut.citations
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 6)
    : [];

  const section =
    typeof brut.section === "string" ? brut.section.trim().slice(0, 4000) : "";

  const confiance = Number(brut.confiance);
  const confianceNormalisee =
    Number.isFinite(confiance) ? Math.min(1, Math.max(0, confiance)) : 0;

  // Une proposition sans citation ni section n'apporte rien de vérifiable.
  if (pertinent && (citations.length === 0 || section.length < 20)) {
    return {
      ...base,
      note:
        "Proposition rejetée : sans citation vérifiable ni section exploitable, " +
        "elle ne mérite pas d'être relue.",
    };
  }

  return {
    slug: salon.channel.articleSlug,
    titre: salon.channel.articleSlug,
    pertinent,
    resume: typeof brut.resume === "string" ? brut.resume.trim().slice(0, 400) : "",
    resumeArticle:
      typeof brut.resumeArticle === "string"
        ? brut.resumeArticle.trim().slice(0, 500)
        : "",
    sectionMarkdown: section,
    citations,
    tags: Array.isArray(brut.tags)
      ? brut.tags
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    confiance: confianceNormalisee,
    note: pertinent ? "" : "L'IA n'a trouvé aucun apport vérifiable.",
  };
}

/**
 * Analyse les trois salons et produit une proposition par page.
 *
 * Les appels sont **séquentiels** et non parallèles : le client espace déjà
 * ses appels, et Gemini est plus fiable et moins coûteux sur un flux lissé.
 */
export async function analyserSalons(): Promise<{ rapport: RapportAnalyse; corpus: CorpusChannel[] }> {
  const corpus = await lireSalonsDeParti();
  const volume = volumeDuCorpus(corpus);

  const propositions: Proposition[] = [];
  for (const salon of corpus) {
    propositions.push(await proposerPourSalon(salon));
  }

  return {
    corpus,
    rapport: {
      salons: corpus.map((item) => ({
        id: item.channel.id,
        libelle: item.channel.libelle,
        lisible: item.lisible,
        messages: item.messages.length,
        erreur: item.erreur,
      })),
      volume,
      propositions,
      sansApport: propositions
        .filter((proposition) => !proposition.pertinent)
        .map((proposition) => proposition.slug),
      erreurs: corpus
        .map((item) => item.erreur)
        .filter((erreur): erreur is string => Boolean(erreur)),
      vide: volume === 0,
    },
  };
}
