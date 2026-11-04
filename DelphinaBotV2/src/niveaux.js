/**
 * Niveaux.
 *
 * Le coût d'un niveau croît : atteindre le niveau `n` demande
 * `palier × n × (n + 1) / 2` points d'expérience au total. C'est la courbe
 * classique — les dix premiers niveaux s'obtiennent vite, les suivants
 * demandent de la présence — et elle a un intérêt technique : la fonction
 * inverse existe sous forme fermée, donc trouver le niveau d'un membre ne
 * demande aucune boucle.
 *
 * Le palier est réglable (`PALIER_XP`, 100 par défaut) : c'est le seul chiffre
 * à changer pour accélérer ou ralentir toute la progression du serveur.
 */

/** XP cumulé nécessaire pour atteindre un niveau. */
export function xpPourNiveau(niveau, palier) {
  const n = Math.max(0, Math.floor(niveau));
  return Math.round((palier * n * (n + 1)) / 2);
}

/** Niveau atteint avec un XP cumulé donné. */
export function niveauPourXp(xp, palier) {
  const points = Math.max(0, xp);
  // Résolution de palier·n·(n+1)/2 ≤ xp : n = ⌊(√(1 + 8·xp/palier) − 1) / 2⌋.
  const n = Math.floor((Math.sqrt(1 + (8 * points) / palier) - 1) / 2);
  return Math.max(0, n);
}

/** Progression dans le niveau courant : `{ debut, fin, ratio, restant }`. */
export function progression(xp, palier) {
  const niveau = niveauPourXp(xp, palier);
  const debut = xpPourNiveau(niveau, palier);
  const fin = xpPourNiveau(niveau + 1, palier);
  const etendue = Math.max(1, fin - debut);

  return {
    niveau,
    debut,
    fin,
    restant: Math.max(0, fin - xp),
    ratio: Math.min(1, Math.max(0, (xp - debut) / etendue)),
  };
}

/** Barre de progression en caractères pleins et vides. */
export function barre(ratio, taille = 18) {
  const remplis = Math.round(Math.min(1, Math.max(0, ratio)) * taille);
  return `${"█".repeat(remplis)}${"░".repeat(Math.max(0, taille - remplis))}`;
}

/** Palier de récompense atteint, s'il y en a un, entre deux niveaux. */
export function recompenseDue(recompenses, ancienNiveau, nouveauNiveau) {
  if (nouveauNiveau <= ancienNiveau) return null;
  return (
    (recompenses ?? []).find(
      (element) => element.niveau > ancienNiveau && element.niveau <= nouveauNiveau,
    ) ?? null
  );
}
