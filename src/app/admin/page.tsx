import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canWrite, getServerSession, isDauphin } from "@/lib/auth";
import { ROLE_INFO } from "@/lib/types";
import { getAllArticles, storageName } from "@/lib/articles-store";
import { getStorageError } from "@/lib/store";
import { maskDatabaseUrl } from "@/lib/store/errors";
import { categoryIcon, categoryLabel, formatDateTime } from "@/lib/constants";
import DeleteArticleButton from "@/components/admin/DeleteArticleButton";
import DiscordSyncPanel from "@/components/admin/DiscordSyncPanel";
import InstallSeedButton from "@/components/admin/InstallSeedButton";
import LogoutButton from "@/components/admin/LogoutButton";
import RoleBadge from "@/components/RoleBadge";
import MobileNav from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Administration",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session) redirect("/connexion?next=/admin");

  const dauphin = isDauphin(session);
  const writer = canWrite(session);
  const articles = await getAllArticles();

  return (
    <div className="space-y-8">
      <MobileNav />

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-night-600 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-bronze-400">
            Accès restreint
          </p>
          <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold text-gold-200">
            Administration du wiki
            <RoleBadge role={session.role} />
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Connecté en tant que <span className="text-gold-300">{session.username}</span>
            {!dauphin && (
              <> — la suppression d&apos;articles et la synchronisation Discord sont
              réservées au Dauphin.</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {writer && (
            <Link
              href="/admin/nouveau"
              className="rounded-md bg-gold-500 px-4 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
            >
              + Nouvel article
            </Link>
          )}
          <Link
            href="/admin/ia"
            className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
          >
            Analyse automatique
          </Link>
          <Link
            href="/admin/activite"
            className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
          >
            Activité
          </Link>
          <a
            href="/api/articles/export"
            className="rounded-md border border-night-500 px-3 py-2.5 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
          >
            Exporter
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {dauphin ? (
          <DiscordSyncPanel />
        ) : (
          <section className="rounded-xl border border-night-600 bg-night-800/60 p-5">
            <h2 className="font-medium text-slate-100">Synchronisation Discord</h2>
            <p className="mt-2 text-sm text-slate-400">
              Réservée au Dauphin : elle écrit dans les profils des personnalités
              (avatar, rôles, ancienneté) à partir des données réelles du serveur.
            </p>
          </section>
        )}
        {dauphin && <InstallSeedButton />}
        <div className="rounded-xl border border-night-600 bg-night-800/60 p-5">
          <p className="font-medium text-slate-100">Infrastructures</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            <li>
              Stockage :{" "}
              <span className="text-bronze-300">
                {storageName() === "postgres"
                  ? `PostgreSQL — ${maskDatabaseUrl(process.env.DATABASE_URL)}`
                  : "fichiers JSON (data/) — renseignez DATABASE_URL pour PostgreSQL"}
              </span>
            </li>
            <li>
              {articles.length} article{articles.length > 1 ? "s" : ""} · 50 révisions
              maximum par article, restaurables.
            </li>
            <li>Session : JWT HS256 signée, 8 heures, révocable à tout moment.</li>
            <li>
              Sonde de santé :{" "}
              <code className="rounded bg-night-700 px-1.5 py-0.5 text-bronze-300">
                /api/health
              </code>
            </li>
          </ul>
          {getStorageError() && (
            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Incident récent : {getStorageError()?.message}
            </p>
          )}
        </div>
      </div>

      {articles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-night-500 p-6 text-sm text-slate-400">
          Aucun article. Créez le premier avec « Nouvel article ».
        </p>
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="flex flex-col gap-3 rounded-xl border border-night-600 bg-night-800/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs text-bronze-400">
                  {categoryIcon(article.category)} {categoryLabel(article.category)}
                  {article.discordUserId && (
                    <span className="ml-2 text-emerald-400/80">● Discord lié</span>
                  )}
                </p>
                {/* Titre complet : la liste d'administration est un outil de
                    travail, un titre tronqué fait chercher l'article à l'aveugle. */}
                <p className="font-medium leading-snug text-slate-100 [overflow-wrap:anywhere]">
                  {article.title}
                </p>
                <p className="text-xs text-slate-400">
                  /wiki/{article.slug} · modifié le {formatDateTime(article.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={`/wiki/${article.slug}`}
                  className="rounded-md border border-night-500 px-3 py-3 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
                >
                  Voir
                </Link>
                <Link
                  href={`/admin/${article.slug}/modifier`}
                  className="rounded-md border border-gold-500/40 px-3 py-3 text-xs font-medium text-gold-300 transition hover:bg-gold-500/10"
                >
                  Modifier
                </Link>
                <Link
                  href={`/admin/${article.slug}/historique`}
                  className="rounded-md border border-night-500 px-3 py-3 text-xs text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
                >
                  Historique
                </Link>
                {dauphin && <DeleteArticleButton slug={article.slug} title={article.title} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
