import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedArticleBySlug, getPublishedArticles, getRevisionsBySlug } from "@/lib/articles-store";
import { getServerSession, canWrite } from "@/lib/auth";
import { categoryIcon, categoryLabel, formatDateTime } from "@/lib/constants";
import { extractHeadings } from "@/lib/markdown";
import { buildArticleInfobox } from "@/lib/infobox";
import { withAvatar } from "@/lib/avatar-url";
import { characterBySlug } from "@/lib/roster";
import { getDiscordSnapshot } from "@/lib/discord";
import { buildLinkMap, computeBacklinks, neighbours, relatedArticles } from "@/lib/link-graph";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import PdfPreview from "@/components/PdfPreview";
import Infobox from "@/components/Infobox";
import TableOfContents from "@/components/TableOfContents";
import ArticleToolbar from "@/components/ArticleToolbar";
import DiscordProfileCard from "@/components/DiscordProfileCard";
import RevisionTimeline from "@/components/RevisionTimeline";
import ReadingProgress from "@/components/ReadingProgress";
import MobileNav from "@/components/MobileNav";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return { title: "Article introuvable" };
  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) notFound();

  const headings = extractHeadings(article.content);
  const isPersonality = article.category === "personnalites";
  const [all, revisions, discordSnapshot, session] = await Promise.all([
    getPublishedArticles(),
    getRevisionsBySlug(article.slug),
    isPersonality ? getDiscordSnapshot() : Promise.resolve(null),
    getServerSession(),
  ]);
  const related = relatedArticles(all, article, 4);
  const backlinks = computeBacklinks(all, article.slug);
  const { previous, next } = neighbours(all, article);
  const linkMap = buildLinkMap(all);
  // Encadré de synthèse : données saisies par la rédaction, complétées par la
  // notice réelle de l'article (rédacteur, dates, nombre de versions).
  const baseInfobox = buildArticleInfobox(article, { revisionCount: revisions.length });
  // Portrait : l'identifiant Discord connu de l'article, ou celui déclaré dans
  // la configuration partagée (shared/roster.json) si la synchronisation n'a
  // encore rien enregistré. Photo actuelle via l'API, repli sur le cache local.
  const character = isPersonality ? characterBySlug(article.slug) : null;
  const discordUserId = article.discordUserId ?? character?.discordUserId ?? undefined;
  const infobox = isPersonality
    ? withAvatar(baseInfobox, discordUserId, discordSnapshot, character?.nom ?? article.title)
    : baseInfobox;
  const editable = canWrite(session);

  return (
    <div className="space-y-8">
      <ReadingProgress targetId="article" />
      <MobileNav />

      {/* Fil d'Ariane — l'encyclopédie remonte toujours vers la catégorie. */}
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-2 text-sm text-slate-400"
      >
        <Link href="/wiki" className="py-2.5 transition hover:text-gold-200">
          Wiki
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/wiki/categorie/${article.category}`}
          className="py-2.5 transition hover:text-gold-200"
        >
          {categoryLabel(article.category)}
        </Link>
      </nav>

      {/* Onglets d'article : la vue courante, l'historique, et l'édition pour
          les seules charges qui en ont le droit (article P-1 de la
          Constitution — voir `canWrite`). */}
      <div className="border-b border-night-600">
        <ArticleToolbar
          items={[
            { href: `/wiki/${article.slug}`, label: "Article", active: true },
            {
              href: `/wiki/${article.slug}/versions`,
              label: `Versions (${revisions.length})`,
            },
            ...(editable
              ? [
                  {
                    href: `/admin/${article.slug}/modifier`,
                    label: "Modifier",
                    protected: true,
                  },
                ]
              : []),
          ]}
        />
      </div>

      {/* En-tête de l'article. L'encyclopédie ne redundance pas : le titre et
          son résumé (« chapeau ») suffisent, l'historique est en bas d'article. */}
      <header>
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
          <span aria-hidden>{categoryIcon(article.category)}</span>
          {categoryLabel(article.category)}
        </p>
        <h1 className="mt-2 text-balance font-display text-3xl font-semibold leading-tight text-gold-200 sm:text-4xl">
          {article.title}
        </h1>
        {article.summary ? (
          <p className="mt-4 max-w-prose border-l-2 border-gold-500/50 pl-4 font-serif text-lg leading-relaxed text-slate-300">
            {article.summary}
          </p>
        ) : null}
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_290px]">
        {/* `min-w-0` : sans lui, l'article ne peut pas rétrécir sous la largeur
            de son contenu (un mot très long, un tableau) et la colonne déborde. */}
        <article id="article" className="min-w-0">
          {/* Sous 1280 px, l'infobox et le sommaire passent en blocs repliables
              au-dessus de l'article : sans la colonne latérale, ils resteraient
              inaccessibles. */}
          <Infobox
            infobox={infobox}
            title={article.title}
            collapsible
            className="mb-4 xl:hidden"
          />
          <TableOfContents
            headings={headings}
            collapsible
            collapsibleLabel="Sommaire de l'article"
            className="mb-8 xl:hidden"
          />

          {/* Fiche issue de l'API Discord (photo, rôle, ancienneté) : elle
              donne les faits vérifiables avant la lecture, et indique
              honnêtement quand la synchronisation n'a pas eu lieu. */}
          {isPersonality && (
            <DiscordProfileCard
              snapshot={discordSnapshot}
              discordUserId={discordUserId}
              fallbackName={character?.nom ?? article.title}
            />
          )}

          <MarkdownRenderer markdown={article.content} linkMap={linkMap} />

          {article.slug === "la-constitution" && (
            <section className="mt-12" aria-labelledby="document-officiel">
              <h2
                id="document-officiel"
                className="mb-3 border-b border-night-600 pb-2 font-sans text-2xl font-bold text-gold-200"
              >
                Document officiel
              </h2>
              <PdfPreview
                src="/Constitution.pdf"
                title="Constitution et Hiérarchie du IIIe Delphinat Gratiennois"
                downloadName="Constitution-IIIe-Delphinat.pdf"
              />
            </section>
          )}

          {/* Encadrés de fin d'article : dans une encyclopédie, ces rubriques
              (« Voir aussi », « Notes », « Références »…) sont encadrées et
              réduites, elles servent à la navigation, pas à la lecture. */}
          {related.length > 0 && (
            <aside
              aria-labelledby="articles-lies"
              className="mt-12 rounded-xl border border-night-600 bg-night-800/40 p-5"
            >
              <h2
                id="articles-lies"
                className="mb-1 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-gold-300"
              >
                Voir aussi
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {related.map((relatedArticle) => (
                  <li key={relatedArticle.slug}>
                    <Link
                      href={`/wiki/${relatedArticle.slug}`}
                      className="group flex h-full items-start gap-2 rounded-lg p-2 transition hover:bg-night-700/60"
                    >
                      <span aria-hidden className="mt-0.5 text-bronze-400 transition group-hover:text-gold-300">
                        ➔
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-100 transition group-hover:text-gold-200">
                          {relatedArticle.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {categoryIcon(relatedArticle.category)}{" "}
                          {categoryLabel(relatedArticle.category)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {backlinks.length > 0 && (
            <aside
              aria-labelledby="retroliens"
              className="mt-6 rounded-xl border border-night-600 bg-night-800/40 p-5"
            >
              <h2
                id="retroliens"
                className="mb-1 font-sans text-sm font-semibold uppercase tracking-[0.18em] text-gold-300"
              >
                Cité par
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {backlinks.map((backlink) => (
                  <li key={backlink.slug}>
                    <Link
                      href={`/wiki/${backlink.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-night-600 px-3.5 py-3 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
                    >
                      ← {backlink.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {/* Catégories : l'encyclopédie les masque presque toujours dans un
              encadré discret en bas d'article. */}
          <footer className="mt-8 border-t border-night-600 pt-5 text-sm text-slate-400">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-bronze-400">
                Catégories
              </span>
              <Link
                href={`/wiki/categorie/${article.category}`}                    className="rounded border border-night-600 px-3 py-2.5 transition hover:border-gold-500/50 hover:text-gold-200"
              >
                {categoryIcon(article.category)} {categoryLabel(article.category)}
              </Link>
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded border border-night-600 px-2.5 py-2.5 transition hover:border-gold-500/50 hover:text-gold-200"
                >
                  {tag}
                </Link>
              ))}
            </p>
            {/* Mention de bas d'article : quand la dernière modification a eu
                lieu et par qui — information que toute encyclopédie publie. */}
            <p className="mt-3 text-xs">
              La dernière modification de cette page a été réalisée le{" "}
              {formatDateTime(article.updatedAt)} par{" "}
              <span className="text-bronze-300">{article.author}</span>.
            </p>
          </footer>

          {(previous || next) && (
            <nav
              aria-label="Navigation entre articles"
              className="mt-8 grid gap-3 sm:grid-cols-2"
            >
              {previous ? (
                <Link
                  href={`/wiki/${previous.slug}`}
                  className="rounded-lg border border-night-600 bg-night-800/50 p-4 transition hover:border-gold-500/50"
                >
                  <span className="block text-xs text-slate-400">← Article précédent</span>
                  <span className="mt-0.5 block text-sm font-medium text-slate-200">
                    {previous.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/wiki/${next.slug}`}
                  className="rounded-lg border border-night-600 bg-night-800/50 p-4 text-right transition hover:border-gold-500/50"
                >
                  <span className="block text-xs text-slate-400">Article suivant →</span>
                  <span className="mt-0.5 block text-sm font-medium text-slate-200">
                    {next.title}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </article>

        {/* Colonne latérale façon Wikipédia : infobox puis sommaire, solidaires
            et défilables pour rester accessibles sur les longs articles. */}
        <div className="hidden min-w-0 xl:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pb-4">
            <Infobox infobox={infobox} title={article.title} />
            <TableOfContents headings={headings} />
          </div>
        </div>
      </div>

      <RevisionTimeline revisions={revisions} />
    </div>
  );
}
