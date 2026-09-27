/**
 * Squelette de chargement de l'espace d'administration.
 *
 * Il est volontairement limité à `/admin` : un `loading.tsx` à la racine crée
 * une frontière Suspense qui envoie la réponse HTTP avant que la page ait pu
 * résoudre son contenu — les pages publiques perdaient alors leur vrai code
 * 404 (un article inexistant répondait 200). Le wiki public n'en a pas besoin :
 * l'App Router y conserve la page précédente pendant la navigation.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-4 py-6" role="status" aria-live="polite">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-night-800" />
      <div className="h-4 w-full animate-pulse rounded-md bg-night-800/70" />
      <div className="h-4 w-5/6 animate-pulse rounded-md bg-night-800/70" />
      <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-night-800/60" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
