/**
 * Page affichée quand la base de données ne répond pas.
 *
 * C'est un composant **serveur**, contrairement à `app/error.tsx`. La nuance
 * compte : la frontière d'erreur de Next est un composant client, et en
 * production Next masque le message d'exception — il n'envoie que le `digest`.
 * Le visiteur n'avait donc ni explication, ni texte, tant que le JavaScript
 * n'avait pas fini de charger : la page restait blanche.
 *
 * Rendue ici, côté serveur, la page arrive **complète dans le HTML initial**.
 * Elle s'affiche même avec le JavaScript désactivé, et elle explique ce qu'il
 * faut faire au lieu de renvoyer une page d'erreur générique.
 */
import { SITE } from "@/lib/constants";

export default function StoreUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <p className="font-display text-5xl font-semibold text-gold-300">
        Wiki momentanément indisponible
      </p>

      <h1 className="mt-4 text-balance font-display text-2xl font-semibold text-gold-200">
        Le contenu n&apos;a pas pu être chargé
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
        La base de données du wiki n&apos;a pas répondu. Ce n&apos;est pas une
        perte de contenu : les articles sont intacts, personne n&apos;a rien
        supprimé. Il suffit de rétablir la connexion pour que tout revienne.
      </p>

      <div className="mx-auto mt-6 max-w-lg rounded-md border border-night-500 bg-night-800/60 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
          Détail technique
        </p>
        <p className="mt-2 break-words font-mono text-xs leading-relaxed text-slate-400">
          {message}
        </p>
      </div>

      <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-slate-400">
        Si le wiki est déployé, la cause est presque toujours l&apos;une de ces
        trois : la base de données est arrêtée, la variable{" "}
        <code className="rounded bg-night-800 px-1 py-0.5 font-mono text-xs text-gold-300">
          DATABASE_URL
        </code>{" "}
        a changé, ou la base attend un mot de passe différent de celui configuré.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/* Balise simple plutôt qu'un bouton : cette page doit fonctionner
            même si le JavaScript n'a pas été chargé. */}
        <a
          href="/"
          className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
        >
          Réessayer
        </a>
        <a
          href="/api/health"
          className="rounded-md border border-gold-500/50 px-5 py-2.5 text-sm text-gold-200 transition hover:bg-gold-500/10"
        >
          État du service
        </a>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        {SITE.wikiName} — {SITE.name}
      </p>
    </div>
  );
}
