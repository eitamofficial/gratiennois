import Link from "next/link";
import { getServerSession, hasFullAccess } from "@/lib/auth";
import { listComments } from "@/lib/comments-store";
import { formatDateTime } from "@/lib/constants";
import { ROLE_INFO, sessionLabel } from "@/lib/types";
import CommentForm from "./CommentForm";
import DeleteCommentButton from "./DeleteCommentButton";

/**
 * Fil de discussion d'un article.
 *
 * Composant serveur : le fil est rendu avec la page, ce qui évite un appel
 * réseau supplémentaire et laisse le contenu lisible même si le JavaScript
 * n'arrive pas. Seuls le formulaire et le bouton de suppression sont clients.
 *
 * Le commentaire est affiché en texte brut, `whitespace-pre-wrap` compris : ni
 * Markdown, ni HTML. Une discussion n'a pas à pouvoir fabriquer un lien ou une
 * balise — c'est la surface d'attaque la plus banale et la plus évitable.
 */
export default async function Comments({ slug }: { slug: string }) {
  const [session, comments] = await Promise.all([getServerSession(), listComments(slug)]);
  const modere = hasFullAccess(session);

  return (
    <section
      id="discussion"
      aria-labelledby="discussion-titre"
      className="mt-12 rounded-xl border border-night-600 bg-night-800/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="discussion-titre"
          className="font-display text-xl font-semibold text-gold-200"
        >
          Discussion
        </h2>
        <p className="text-xs text-slate-500">
          {comments.length === 0
            ? "Aucun message pour l'instant."
            : `${comments.length} message${comments.length > 1 ? "s" : ""}`}
        </p>
      </div>

      {session ? (
        <>
          <p className="mt-1 text-xs text-slate-500">
            Vous écrivez en tant que{" "}
            <span className="text-bronze-300">{sessionLabel(session)}</span>
            {modere ? " · modération ouverte (accès complet)" : ""}.
          </p>
          <CommentForm slug={slug} />
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-gold-500/25 bg-gold-500/5 px-4 py-3">
          <p className="text-sm text-slate-300">
            <Link
              href={`/connexion?next=${encodeURIComponent(`/wiki/${slug}`)}`}
              className="font-medium text-gold-300 underline decoration-gold-500/40 underline-offset-2 hover:text-gold-200"
            >
              Connectez-vous avec Discord
            </Link>{" "}
            pour participer à la discussion.
          </p>
        </div>
      )}

      {comments.length > 0 && (
        <ol className="mt-6 space-y-5">
          {comments.map((comment) => {
            const role = ROLE_INFO[comment.role as keyof typeof ROLE_INFO];
            const peutSupprimer =
              session && (comment.author === session.username || modere);

            return (
              <li key={comment.id} className="flex gap-3">
                {comment.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar distant
                  <img
                    src={comment.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-gold-500/30 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-sm font-semibold text-gold-200"
                  >
                    {comment.displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-slate-100">
                      {comment.displayName}
                    </span>
                    {role && (
                      <span className="rounded border border-gold-500/30 px-1.5 py-px text-[10px] uppercase tracking-wide text-bronze-300">
                        {role.label}
                      </span>
                    )}
                    <time
                      dateTime={comment.createdAt}
                      className="text-xs text-slate-500"
                    >
                      {formatDateTime(comment.createdAt)}
                    </time>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                    {comment.content}
                  </p>
                  {peutSupprimer && (
                    <div className="mt-1">
                      <DeleteCommentButton id={comment.id} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
