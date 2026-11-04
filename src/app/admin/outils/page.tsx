import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { canWrite, getServerSession, hasFullAccess } from "@/lib/auth";
import { getAllArticles, getRecentRevisions } from "@/lib/articles-store";
import {
  completeness,
  duplicateTitles,
  externalLinks,
  inboundCounts,
  orphans,
} from "@/lib/analysis";
import {
  addRedirect,
  deleteRedirect,
  getSettings,
  listBans,
  listEntities,
  listRedirects,
  listSessions,
  listWebhooks,
  loginHistory,
  moderationQueue,
  openVotes,
  unban,
} from "@/lib/features";
import { formatDateTime } from "@/lib/constants";
import PageHeader, { PageShell } from "@/components/PageHeader";
import ActionButton from "@/components/admin/ActionButton";
import SettingsPanel from "@/components/admin/SettingsPanel";

export const metadata: Metadata = { title: "Outils d'administration" };
export const dynamic = "force-dynamic";

export default async function OutilsPage() {
  const session = await getServerSession();
  if (!session) redirect("/connexion?suite=/admin/outils");
  if (!canWrite(session)) redirect("/admin");
  const complet = hasFullAccess(session);

  const [articles, revisions, settings, sessions, logins, queue, bans, redirects, entities, hooks, votes] =
    await Promise.all([
      getAllArticles(),
      getRecentRevisions(1),
      getSettings(),
      listSessions(),
      loginHistory(20),
      moderationQueue(),
      listBans(),
      listRedirects(),
      listEntities(),
      listWebhooks(),
      openVotes(),
    ]);

  const counts = inboundCounts(articles);
  const orphelins = orphans(articles);
  const doublons = duplicateTitles(articles);
  const liens = externalLinks(articles);
  const faibles = articles
    .map((article) => ({
      article,
      score: completeness(article, counts.get(article.slug) ?? 0),
    }))
    .sort((a, b) => a.score.score - b.score.score)
    .slice(0, 8);

  async function creerRedirection(formData: FormData) {
    "use server";
    const active = await getServerSession();
    if (!active || !hasFullAccess(active)) return;
    const from = String(formData.get("from") ?? "").trim();
    const to = String(formData.get("to") ?? "").trim();
    if (!from || !to) return;
    await addRedirect(from, to, active.username);
    revalidatePath("/admin/outils");
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Administration"
        icon="🧰"
        title="Outils"
        aside={
          <Link href="/admin" className="text-xs text-bronze-300 hover:text-gold-200">
            ← Tableau de bord
          </Link>
        }
      >
        <p>
          Maintenance éditoriale, sessions et réglages d&apos;urgence. Les compteurs
          sont calculés à chaque affichage, jamais mis en cache : un rapport
          périmé est pire qu&apos;aucun rapport.
        </p>
        {revisions[0] && (
          <p className="text-xs text-slate-500">
            Dernière révision : {formatDateTime(revisions[0].createdAt)}
          </p>
        )}
      </PageHeader>

      <section className="rounded-xl border border-night-600 bg-night-800/40 p-5">
        <h2 className="font-display text-lg text-gold-200">Réglages d&apos;urgence</h2>
        {complet ? (
          <div className="mt-3">
            <SettingsPanel
              readOnly={settings.readOnly === true}
              readOnlyReason={settings.readOnlyReason ?? ""}
              banner={settings.banner ?? ""}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">Réservé à l&apos;accès complet.</p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Pages orphelines</h2>
          <p className="text-xs text-slate-500">
            Aucun lien entrant : introuvables pour un lecteur qui ne connaît pas
            l&apos;adresse.
          </p>
          {orphelins.length === 0 ? (
            <p className="mt-2 text-xs text-emerald-300">Aucune.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {orphelins.slice(0, 10).map((article) => (
                <li key={article.slug}>
                  <Link href={`/wiki/${article.slug}`} className="text-slate-300 hover:text-gold-200">
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {orphelins.length > 10 && (
            <p className="mt-1 text-xs text-slate-500">+ {orphelins.length - 10} autres</p>
          )}
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Complétude la plus faible</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {faibles.map(({ article, score }) => (
              <li key={article.slug} className="flex items-baseline gap-2">
                <Link href={`/wiki/${article.slug}`} className="text-slate-300 hover:text-gold-200">
                  {article.title}
                </Link>
                <span className="ml-auto text-xs text-slate-500">{score.score} %</span>
              </li>
            ))}
          </ul>
          {faibles[0] && faibles[0].score.missing.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Manque le plus souvent : {faibles[0].score.missing.join(", ")}.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Titres en double</h2>
          {doublons.size === 0 ? (
            <p className="mt-2 text-xs text-emerald-300">Aucun.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {[...doublons.keys()].slice(0, 8).map((titre) => (
                <li key={titre}>{titre}</li>
              ))}
            </ul>
          )}
          <Link href="/homonymie" className="mt-2 inline-block text-xs text-bronze-300 hover:text-gold-200">
            Voir la page publique →
          </Link>
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Liens externes à vérifier</h2>
          <p className="text-xs text-slate-500">
            {liens.length} liens sortants. Le script{" "}
            <code className="text-bronze-300">scripts/check-liens.mjs</code> teste
            leur réponse et signale les 404.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {liens.slice(0, 5).map((lien) => (
              <li key={`${lien.slug}-${lien.url}`} className="truncate">
                {lien.slug} → {lien.url}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Sessions actives</h2>
          <ul className="mt-2 space-y-2 text-xs">
            {sessions.slice(0, 6).map((entree) => (
              <li key={entree.id} className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200">{entree.username}</span>
                <span className="text-slate-500">{entree.role}</span>
                <span className="text-slate-500">{entree.ip}</span>
                <span className="text-slate-600">{formatDateTime(entree.lastSeen)}</span>
                {entree.revokedAt ? (
                  <span className="text-rose-300">révoquée</span>
                ) : (
                  <ActionButton
                    url={`/api/features/sessions?id=${encodeURIComponent(entree.id)}`}
                    method="DELETE"
                    label="Révoquer"
                    tone="danger"
                  />
                )}
              </li>
            ))}
            {sessions.length === 0 && <li className="text-slate-500">Aucune session enregistrée.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Dernières connexions</h2>
          <ul className="mt-2 space-y-1 text-xs">
            {logins.slice(0, 8).map((entree) => (
              <li key={entree.id} className="flex flex-wrap items-center gap-2">
                <span className={entree.ok ? "text-emerald-300" : "text-rose-300"}>
                  {entree.ok ? "✓" : "✕"}
                </span>
                <span className="text-slate-200">{entree.username}</span>
                <span className="text-slate-500">{entree.ip}</span>
                <span className="text-slate-600">{formatDateTime(entree.at)}</span>
                {entree.reason && <span className="text-slate-500">({entree.reason})</span>}
              </li>
            ))}
            {logins.length === 0 && <li className="text-slate-500">Journal vide.</li>}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-night-600 bg-night-800/40 p-5">
        <h2 className="font-display text-lg text-gold-200">Redirections</h2>
        <p className="text-xs text-slate-500">
          Un ancien titre, une faute de frappe fréquente : la redirection évite une
          404 sans créer une page vide.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {redirects.map((redirect) => (
            <li key={redirect.id} className="flex flex-wrap items-center gap-2">
              <code className="text-bronze-300">{redirect.from}</code>
              <span aria-hidden className="text-slate-500">→</span>
              <code className="text-slate-300">{redirect.to}</code>
              <ActionButton
                url={`/api/features/redirects?id=${encodeURIComponent(redirect.id)}`}
                method="DELETE"
                label="Supprimer"
                tone="danger"
              />
            </li>
          ))}
          {redirects.length === 0 && <li className="text-xs text-slate-500">Aucune redirection.</li>}
        </ul>
        {complet && (
          <form action={creerRedirection} className="mt-3 flex flex-wrap gap-2">
            <input
              name="from"
              required
              placeholder="ancien-slug"
              className="rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-xs text-slate-200"
            />
            <input
              name="to"
              required
              placeholder="nouveau-slug"
              className="rounded-md border border-night-500 bg-night-900 px-2 py-1.5 text-xs text-slate-200"
            />
            <button type="submit" className="rounded-md border border-gold-500 px-3 py-1 text-xs text-gold-200">
              Ajouter
            </button>
          </form>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">File de modération</h2>
          <ul className="mt-2 space-y-2 text-xs">
            {queue.slice(0, 8).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200">{item.slug}</span>
                <span className="text-slate-500">{item.reason}</span>
                <span className="text-slate-600">{item.status}</span>
                {item.status === "attente" && (
                  <>
                    <ActionButton
                      url="/api/features/moderation"
                      body={{ id: item.id, status: "approuve" }}
                      label="Approuver"
                    />
                    <ActionButton
                      url="/api/features/moderation"
                      body={{ id: item.id, status: "rejete" }}
                      label="Rejeter"
                      tone="danger"
                    />
                  </>
                )}
              </li>
            ))}
            {queue.length === 0 && <li className="text-slate-500">File vide.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Suspensions</h2>
          <ul className="mt-2 space-y-2 text-xs">
            {bans.slice(0, 6).map((entree) => (
              <li key={entree.id} className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200">{entree.username}</span>
                <span className="text-slate-500">{entree.reason}</span>
                <ActionButton
                  url={`/api/features/bans?id=${encodeURIComponent(entree.id)}`}
                  method="DELETE"
                  label="Lever"
                />
              </li>
            ))}
            {bans.length === 0 && <li className="text-slate-500">Aucune suspension.</li>}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Votes en cours</h2>
          <ul className="mt-2 space-y-1 text-xs">
            {votes.slice(0, 8).map((vote) => (
              <li key={vote.id} className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200">{vote.slug}</span>
                <span className="text-slate-500">{vote.kind}</span>
                <span className="text-slate-400">{vote.choice}</span>
              </li>
            ))}
            {votes.length === 0 && <li className="text-slate-500">Aucun vote.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-night-600 bg-night-800/40 p-5">
          <h2 className="font-display text-lg text-gold-200">Entités et webhooks</h2>
          <p className="text-xs text-slate-500">
            {entities.length} entité{entities.length > 1 ? "s" : ""} structurée
            {entities.length > 1 ? "s" : ""} · {hooks.length} webhook
            {hooks.length > 1 ? "s" : ""} actif{hooks.length > 1 ? "s" : ""}.
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {entities.slice(0, 5).map((entity) => (
              <li key={entity.id}>
                {entity.name} <span className="text-slate-600">({entity.kind})</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        {redirects.length} redirections · {sessions.length} sessions ·{" "}
        {articles.length} articles · {orphelins.length} orphelins · {liens.length} liens
        externes.
      </p>
    </PageShell>
  );
}
