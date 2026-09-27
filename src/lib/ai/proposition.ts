/**
 * Utilitaires sur les **propositions** de l'analyse automatique.
 *
 * Une proposition est une page structurée : elle porte à la fois le
 * diagnostic de l'IA (source analysée, confiance, citations) et le texte
 * destiné à l'article. Publier, ce n'est pas recopier la page : c'est en
 * extraire la partie utile.
 *
 * Ces fonctions vivent hors de `route.ts` parce que Next.js n'autorise dans un
 * fichier de route que les gestionnaires HTTP et la configuration du module :
 * toute autre exportation fait échouer la compilation.
 */

/**
 * Isole la section proposée dans le corps d'une proposition.
 *
 * Renvoie le texte compris entre « ## Section proposée » et « ## Étiquettes
 * proposées », en retirant l'indicateur de remplacement quand la section est
 * vide. Renvoie une chaîne vide si la structure est absente : mieux vaut ne rien
 * publier que d'insérer des marqueurs de mise en forme dans un article.
 */
export function extraireSection(contenu: string): string {
  const debut = /^##\s+Section proposée\s*$/im.exec(contenu);
  if (!debut) return "";

  const suite = /^##\s+Étiquettes proposées\s*$/im.exec(
    contenu.slice(debut.index + debut[0].length),
  );

  const bloc = suite
    ? contenu.slice(
        debut.index + debut[0].length,
        debut.index + debut[0].length + suite.index,
      )
    : contenu.slice(debut.index + debut[0].length);

  // « _Non précisée._ » : un remplacement, pas un contenu.
  return bloc.replace(/^_[\s\S]*?_$/m, "").trim();
}

/** Citations listées dans une proposition, dans l'ordre. */
export function extraireCitations(contenu: string): string[] {
  const debut = /^##\s+Citations justifiant la proposition\s*$/im.exec(contenu);
  if (!debut) return [];

  const fin = /^##\s+/im.exec(contenu.slice(debut.index + debut[0].length));
  const bloc = fin
    ? contenu.slice(debut.index + debut[0].length, debut.index + debut[0].length + fin.index)
    : contenu.slice(debut.index + debut[0].length);

  return bloc
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.startsWith(">"))
    .map((ligne) => ligne.replace(/^>\s?/, ""))
    .filter(Boolean);
}
