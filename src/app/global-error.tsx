"use client";

/**
 * Dernier filet, pour la panne que rien d'autre n'attrape.
 *
 * `global-error.tsx` remplace **entièrement** le layout racine : c'est le seul
 * endroit du projet où le document HTML doit être écrit à la main. Il sert
 * quand l'échec survient au niveau de la racine — une police qui ne se charge
 * pas, un composant du layout qui casse — situations où ni la page d'erreur ni
 * le layout ne peuvent plus rien afficher. Sans ce fichier, le visiteur
 * n'obtient qu'une page blanche sans la moindre explication.
 *
 * Deux contraintes expliquent sa forme : il ne peut utiliser aucun composant du
 * projet (ceux-ci peuvent être précisément ce qui a échoué) et il doit embarquer
 * la feuille de style, puisque le layout qui l'importait vient d'être écarté.
 */
import "./globals.css";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-night-900 font-sans text-slate-200">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20 text-center">
          <p className="font-display text-5xl font-semibold text-gold-300">
            Erreur
          </p>
          <h1 className="mt-4 text-balance font-display text-2xl font-semibold text-gold-200">
            Le wiki n&apos;a pas pu démarrer
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
            Une erreur est survenue avant même que la page puisse s&apos;afficher.
            Le contenu n&apos;est pas en cause. Rechargez la page ; si le
            problème persiste, consultez la page d&apos;état du service.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-slate-500">
              Référence : {error.digest}
            </p>
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
              href="/api/health"
              className="rounded-md border border-gold-500/50 px-5 py-2.5 text-sm text-gold-200 transition hover:bg-gold-500/10"
            >
              État du service
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
