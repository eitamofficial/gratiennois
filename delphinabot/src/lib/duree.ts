/**
 * Durées.
 *
 * Discord ne parle que millisecondes ; l'utilisateur tape `10m`. Ce fichier
 * fait la traduction dans les deux sens, en français, et refuse silencieusement
 * tout ce qui n'a pas de sens — une durée fausse vaut mieux qu'un délai
 * imprévisible.
 */

/**
 * Unités reconnues, de la plus grande à la plus petite.
 *
 * L'ordre compte : sans lui, `1m` serait lu comme une minute par la règle des
 * secondes. Chaque motif accepte l'abrégé (`2h`), le mot complet (`2 heures`)
 * et le singulier comme le pluriel.
 */
const UNITES: [motif: string, millisecondes: number][] = [
  ["j(?:ours?)?", 86_400_000],
  ["h(?:e(?:ures?)?)?", 3_600_000],
  ["m(?:in(?:utes?)?)?", 60_000],
  ["s(?:econde?s?)?", 1_000],
];

/**
 * Analyse une durée écrite en français ou en abrégé.
 *
 * Accepte `10m`, `2h30`, `1 j`, `1 heure 30`, `45 secondes`. Le nombre qui
 * suit une unité sans suffixe est lu comme des minutes : c'est la convention
 * implicite de tout le monde, et `2h30` veut dire deux heures trente, pas
 * deux heures et trente secondes.
 */
export function analyserDuree(texte: string): number | null {
  // Les espaces disparaissent : `1 h 30` et `1h30` sont la même saisie.
  const compact = texte.toLowerCase().replace(/\s+/g, "");
  if (!compact) return null;

  let total = 0;
  let reste = compact;

  for (const [motif, millisecondes] of UNITES) {
    const expression = new RegExp(`(\\d+(?:[.,]\\d+)?)${motif}`, "g");
    reste = reste.replace(expression, (_correspondance, quantite: string) => {
      total += Number(quantite.replace(",", ".")) * millisecondes;
      return " ";
    });
  }

  // Un nombre nu à la fin vaut un nombre de minutes : `2h30`.
  reste = reste.replace(/(\d+(?:[.,]\d+)?)(?![\ds])/, (_c, quantite: string) => {
    total += Number(quantite.replace(",", ".")) * 60_000;
    return " ";
  });

  if (!Number.isFinite(total) || total <= 0) return null;
  // Un reste non vide signifie qu'il y avait autre chose que des durées.
  if (reste.replace(/[\s,]/g, "")) return null;
  return Math.round(total);
}

/** Écrit une durée en français lisible : `2 h 30`, `45 s`, `3 j 4 h`. */
export function formaterDuree(millisecondes: number): string {
  const total = Math.max(0, Math.round(millisecondes / 1000));
  if (total === 0) return "0 s";

  const parties: string[] = [];
  let reste = total;

  const jours = Math.floor(reste / 86_400);
  reste -= jours * 86_400;
  if (jours > 0) parties.push(`${jours} j`);

  const heures = Math.floor(reste / 3600);
  reste -= heures * 3600;
  if (heures > 0) parties.push(`${heures} h`);

  const minutes = Math.floor(reste / 60);
  reste -= minutes * 60;
  if (minutes > 0 && jours === 0) parties.push(`${minutes} min`);

  if (parties.length === 0) parties.push(`${reste} s`);
  return parties.join(" ");
}

/** Date et heure en français, à l'heure de Paris. */
export function horodatage(date: Date | number | string = Date.now()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "long",
    timeStyle: "short",
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** Compte à rebours court, pour les temporisations. */
export function compteARebours(date: Date | number): string {
  const cible = typeof date === "number" ? new Date(date) : date;
  return `<t:${Math.round(cible.getTime() / 1000)}:R>`;
}

/** Date absolue Discord, cliquable. */
export function baliseTemps(date: Date | number): string {
  const cible = typeof date === "number" ? new Date(date) : date;
  return `<t:${Math.round(cible.getTime() / 1000)}:F>`;
}
