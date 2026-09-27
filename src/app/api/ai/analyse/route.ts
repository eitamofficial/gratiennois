import { NextResponse } from "next/server";
import { getServerSession, canWrite } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isGeminiConfigured } from "@/lib/gemini";
import { analyserSalons, type Proposition } from "@/lib/ai/analyse";
import { lireSalonsDeParti } from "@/lib/ai/corpus";
import {
  getAllArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
} from "@/lib/articles-store";
import type { Article } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/ai/analyse — état de l'intégration sans rien déclencher.
 *
 * Utile avant de lancer une analyse : le wiki dit ce qu'il peut lire, ce qu'il
 * ne peut pas, et si la clé Gemini est présente. Aucune donnée n'est renvoyée
 * dans un premier temps, pour ne pas vider le salon dans les journaux.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Analyse réservée aux rédacteurs." },
      { status: 403 },
    );
  }

  const salons = await lireSalonsDeParti();
  return NextResponse.json({
    ok: true,
    gemini: isGeminiConfigured(),
    volume: salons.reduce((total, salon) => total + salon.messages.length, 0),
    salons: salons.map((salon) => ({
      id: salon.channel.id,
      libelle: salon.channel.libelle,
      articleSlug: salon.channel.articleSlug,
      lisible: salon.lisible,
      messages: salon.messages.length,
      erreur: salon.erreur,
    })),
  });
}

/**
 * POST /api/ai/analyse — analyse les salons et dépose des **propositions**.
 *
 * L'analyse n'écrit jamais dans les pages publiées. Pour chaque apport retenu,
 * elle crée ou met à jour un article en état `proposition` : invisible du site
 * public, consultable dans `/admin/ia`, publiable d'un clic.
 *
 * Corps attendu (tous les champs optionnels) :
 *   `{ "enregistrer": true }` — dépose les propositions (défaut : true)
 *   `{ "simulation": true }`  — n'enregistre rien, renvoie le rapport seul
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Analyse réservée aux rédacteurs." },
      { status: 403 },
    );
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY absent de l'environnement : l'analyse automatique " +
          "est désactivée. Le reste du wiki fonctionne normalement.",
      },
      { status: 400 },
    );
  }

  // Une analyse coûte des appels et du temps : on la bride par IP.
  const limit = rateLimit("ai-analyse", 4, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop d'analyses récentes. Réessayez dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterSeconds)) } },
    );
  }

  let options: { enregistrer?: boolean } = {};
  try {
    options = (await request.json()) as { enregistrer?: boolean };
  } catch {
    // Corps vide : on garde les valeurs par défaut.
  }
  const simulation = options.enregistrer === false;

  const { rapport, corpus } = await analyserSalons();

  const deposees: Array<{ slug: string; creee: boolean; confiance: number }> = [];
  const articles = await getAllArticles();

  if (!simulation) {
    for (const proposition of rapport.propositions) {
      if (!proposition.pertinent) continue;

      const existante = articles.find(
        (article) => article.slug === proposition.slug,
      );
      const maintenant = new Date().toISOString();

      // La proposition est une page à part entière : elle ne remplace pas la
      // page publiée, elle en propose une version révisée. Le rédacteur est
      // ainsi forcé de comparer avant de décider.
      const corps: Article = {
        slug: `${proposition.slug}-proposition`,
        title: `${proposition.titre} — proposition automatique`,
        // La proposition reprend la catégorie de la page visée, pour ne pas
        // faire apparaître un parti parmi les articles d'histoire.
        category: existante?.category ?? "histoire",
        summary: proposition.resume,
        content: propositionContent(proposition, rapport.salons),
        tags: [...new Set(["proposition", "analyse automatique", ...proposition.tags])],
        author: `Analyse automatique (${session.username} relance l'analyse)`,
        createdAt: existante ? existante.createdAt : maintenant,
        updatedAt: maintenant,
        status: "proposition",
        origin: "ia",
      };

      const dejaLa = await getArticleBySlug(corps.slug);
      if (dejaLa) {
        await updateArticle(corps.slug, {
          title: corps.title,
          category: corps.category,
          summary: corps.summary,
          content: corps.content,
          tags: corps.tags,
          author: corps.author,
          infobox: corps.infobox,
        });
        deposees.push({ slug: corps.slug, creee: false, confiance: proposition.confiance });
      } else {
        await createArticle({
          slug: corps.slug,
          title: corps.title,
          category: corps.category,
          summary: corps.summary,
          content: corps.content,
          tags: corps.tags,
          author: corps.author,
        });
        deposees.push({ slug: corps.slug, creee: true, confiance: proposition.confiance });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    simulation,
    rapport,
    deposees,
    // Le corpus n'est renvoyé qu'en simulation : il contient des messages de
    // membres, et une réponse d'API ne doit pas les exposer inutilement.
    apercu: simulation
      ? corpus.map((salon) => ({
          salon: salon.channel.libelle,
          messages: salon.messages.length,
        }))
      : undefined,
  });
}

/** Met en forme la proposition pour l'affichage et la relecture. */
function propositionContent(
  proposition: Proposition,
  salons: Array<{ libelle: string; messages: number }>,
): string {
  const lignes = [
    `# Proposition de mise à jour — ${proposition.slug}`,
    "",
    "> Cette page a été **rédigée automatiquement** à partir des débats des",
    "> salons de parti. Elle n'est **pas publiée** : elle attend la relecture d'un",
    "> rédacteur. Les affirmations ci-dessous n'ont de valeur que dans la mesure",
    "> où les citations les justifient.",
    "",
    `**Apport annoncé** : ${proposition.resume || "Non précisé."}`,
    "",
    `**Confiance du modèle** : ${Math.round(proposition.confiance * 100)} %`,
    "",
    "## Sources analysées",
    "",
    ...salons.map((salon) => `- ${salon.libelle} — ${salon.messages} messages`),
    "",
    "## Citations justifiant la proposition",
    "",
    ...(proposition.citations.length > 0
      ? proposition.citations.map((citation) => `> ${citation}`)
      : ["> Aucune citation n'a pu être produite."]),
    "",
    "## Résumé d'article proposé",
    "",
    proposition.resumeArticle || "_Non précisé._",
    "",
    "## Section proposée",
    "",
    proposition.sectionMarkdown || "_Non précisée._",
    "",
    "## Étiquettes proposées",
    "",
    proposition.tags.length > 0 ? proposition.tags.join(", ") : "_Aucune._",
  ];

  return lignes.join("\n");
}
