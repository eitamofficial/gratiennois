"use client";

/**
 * Filet de sécurité pour les erreurs non attendues.
 *
 * Ce n'est **pas** la page à utiliser pour une base injoignable : le contrôle
 * posé dans `layout.tsx` s'en charge, et il rend une page serveur, donc lisible
 * sans JavaScript. On arrive ici pour tout le reste.
 *
 * Conséquence importante : en production, Next.js n'envoie au navigateur que le
 * `digest` d'une erreur serveur. Le message n'est jamais transmis — chercher
 * « base de données » dedans revient donc à tester une chaîne qui n'existe pas,
 * et le visiteur recevrait à coup sûr la phrase la plus vague des deux. On ne
 * diagnostique plus à l'aveugle : on donne une consigne valable dans tous les cas
 * et on affiche la référence, qui est la seule chose réellement transmise.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <p className="font-display text-5xl font-semibold text-gold-300">Erreur</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-gold-200">
        Le wiki rencontre un problème technique
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
        Cette page n&apos;a pas pu être affichée. Le wiki n&apos;a rien perdu :
        une seule requête a échoué, et les articles restent intacts. Réessayez
        dans un instant.
      </p>

      {error.digest && (
        <p className="mt-3 text-xs text-slate-400">Référence : {error.digest}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-night-950 transition hover:bg-gold-400"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-md border border-gold-500/50 px-5 py-2.5 text-sm text-gold-200 transition hover:bg-gold-500/10"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
