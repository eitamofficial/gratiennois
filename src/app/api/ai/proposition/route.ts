import { NextResponse } from "next/server";
import { getServerSession, canWrite, isDauphin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  createArticle,
  getAllArticles,
} from "@/lib/articles-store";
import { extraireSection } from "@/lib/ai/proposition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/proposition — décision humaine sur une proposition de l'IA.
 *
 * C'est **le seul endroit** par lequel une rédaction automatique peut devenir
 * un article public. Trois décisions possibles :
 *
 *   - `publier`  : la section proposée est ajoutée à la page visée, et la
 *     proposition disparaît. La page porte alors en pied une mention de source
 *     qui indique ce qui vient des débats et ce qui vient de la rédaction.
 *   - `rejeter`  : la proposition est supprimée. Rien n'est publié.
 *   - `corriger` : le rédacteur fournit lui-même le contenu, qui est publié à la
 *     place de celui de l'IA. Le plus courant en pratique.
 *
 * Corps : `{ "slug": "…-proposition", "decision": "publier|rejeter|corriger",
 *            "contenu": "…", "auteur": "…" }`
 */
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "Décision réservée aux rédacteurs." },
      { status: 403 },
    );
  }

  const limit = rateLimit("ai-proposition", 30, 10 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de décisions en peu de temps." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterSeconds)) } },
    );
  }

  let corps: {
    slug?: string;
    decision?: string;
    contenu?: string;
    auteur?: string;
  };
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const slug = (corps.slug ?? "").trim();
  const decision = (corps.decision ?? "").trim();

  if (!slug || !decision) {
    return NextResponse.json(
      { error: "Les champs « slug » et « decision » sont obligatoires." },
      { status: 400 },
    );
  }

  const proposition = await getArticleBySlug(slug);
  if (!proposition || proposition.status !== "proposition") {
    return NextResponse.json(
      { error: "Cette proposition n'existe pas ou a déjà été traitée." },
      { status: 404 },
    );
  }

  if (decision === "rejeter") {
    await deleteArticle(slug, `${session.username} (rejet d'une proposition)`);
    return NextResponse.json({ ok: true, decision: "rejeter", supprime: slug });
  }

  if (decision !== "publier" && decision !== "corriger") {
    return NextResponse.json(
      {
        error:
          `Décision inconnue : « ${decision} ». Valeurs acceptées : ` +
          "publier, rejeter, corriger.",
      },
      { status: 400 },
    );
  }

  // La page visée est celle dont le nom précède le suffixe.
  const slugCible = slug.replace(/-proposition$/, "");
  const cible = await getArticleBySlug(slugCible);

  if (!cible) {
    return NextResponse.json(
      {
        error:
          `La page visée « ${slugCible} » n'existe pas. Créez-la d'abord, ` +
          "ou corrigez la proposition pour qu'elle devienne une page à part entière.",
      },
      { status: 404 },
    );
  }

  // ------------------------------------------------------------------
  // Publication
  // ------------------------------------------------------------------
  const texte =
    decision === "corriger"
      ? (corps.contenu ?? "").trim()
      : extraireSection(proposition.content);

  if (!texte) {
    return NextResponse.json(
      { error: "Le contenu à publier est vide." },
      { status: 400 },
    );
  }

  const mention =
    `> **Mise à jour automatique du ${new Date().toISOString().slice(0, 10)}.** ` +
    "Cette section a été rédigée par l'analyse automatique des débats des " +
    "salons de parti, puis validée par un rédacteur. Les faits qu'elle énonce " +
    "sont ceux que ces débats rapportent : ils n'ont pas valeur de preuve.";

  const nouveauContenu = [
    cible.content.trimEnd(),
    "",
    mention,
    "",
    texte.trim(),
  ].join("\n");

  await updateArticle(slugCible, {
    title: cible.title,
    category: cible.category,
    summary: corps.auteur ? (corps.auteur ?? cible.summary) : cible.summary,
    content: nouveauContenu,
    tags: [...new Set([...cible.tags, "synchronisé par IA"])],
    author: session.username,
    discordUserId: cible.discordUserId,
    infobox: cible.infobox,
  });

  // La proposition a été consommée : on la retire de la file.
  await deleteArticle(slug, `${session.username} (proposition publiée)`);

  return NextResponse.json({
    ok: true,
    decision,
    publie: slugCible,
    retire: slug,
    auteur: session.username,
    // Rappel utile : le simple fait de publier ne rend pas la page
    // contradictoire, mais cela marque son contenu comme synchronisé.
    synchronise: true,
  });
}

/**
 * GET /api/ai/proposition — file de relecture.
 *
 * Liste les propositions en attente sans leur corps complet : l'espace
 * d'édition n'a besoin que de l'aperçu pour décider quoi ouvrir.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!canWrite(session)) {
    return NextResponse.json(
      { error: "File de relecture réservée aux rédacteurs." },
      { status: 403 },
    );
  }

  const articles = await getAllArticles();
  const propositions = articles
    .filter((article) => article.status === "proposition")
    .map((article) => ({
      slug: article.slug,
      cible: article.slug.replace(/-proposition$/, ""),
      title: article.title,
      resume: article.summary,
      tags: article.tags,
      updatedAt: article.updatedAt,
      auteur: article.author,
      // Un rédacteur simple n'a pas à ouvrir une proposition qu'il ne peut pas
      // ensuite faire appliquer : on l'indique plutôt que de le laisser échouer.
      publiableParToi: isDauphin(session) || canWrite(session),
    }));

  return NextResponse.json({ ok: true, propositions });
}
