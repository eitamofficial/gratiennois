import Link from "next/link";

/**
 * Page d'erreur 404.
 *
 * Elle sert aussi de destination aux **liens rouges** des articles (convention
 * des encyclopédies : un lien rouge mène vers un article qui n'existe pas
 * encore). Le message distingue donc les deux cas — article jamais rédigé et
 * page déplacée — et propose toujours une issue : la recherche, l'index, ou
 * l'espace d'édition.
 */
export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <p className="font-display text-6xl font-semibold text-gold-300">404</p>
      <h1 className="mt-4 text-balance font-display text-2xl font-semibold text-gold-200">
        Cet article n&apos;est pas encore rédigé
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
        Soit la page n&apos;a jamais été écrite, soit elle a été déplacée ou
        supprimée. Dans une encyclopédie, ce lien s&apos;affichait en rouge : il
        signalait une page à créer.
      </p>

      {/* Formulaire GET : la recherche fonctionne sans JavaScript, et c'est le
          réflexe le plus probable d'un lecteur arrivé sur une page absente. */}
      <form
        action="/recherche"
        method="get"
        role="search"
        className="mx-auto mt-8 flex max-w-md gap-2"
      >
        <label htmlFor="not-found-search" className="sr-only">
          Rechercher un article du wiki
        </label>
        <input
          id="not-found-search"
          name="q"
          type="search"
          placeholder="Rechercher un article…"
          className="min-w-0 flex-1 rounded-lg border border-night-500 bg-night-800 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-gold-500 px-5 py-3 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
        >
          Chercher
        </button>
      </form>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/wiki"
          className="rounded-md bg-gold-500 px-5 py-3 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
        >
          Index du wiki
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gold-500/50 px-5 py-3 text-sm text-gold-200 transition hover:bg-gold-500/10"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/admin/nouveau"
          prefetch={false}
          className="rounded-md border border-night-500 px-5 py-3 text-sm text-slate-300 transition hover:border-gold-500/50 hover:text-gold-200"
        >
          Proposer cet article
        </Link>
      </div>
    </div>
  );
}
