/**
 * Badge de rôle **Discord**.
 *
 * La couleur du rôle (fournie par l'API Discord) est une couleur d'icône :
 * elle sert de pastille décorative, jamais de couleur de texte. L'utiliser comme
 * couleur de texte donnait des contrastes de 1,3:1 à 2,7:1 — le texte devenait
 * illisible sur les rôles clairs, dans le thème sombre comme dans le thème clair.
 *
 * Le libellé, lui, prend toujours la couleur de texte du thème : garantie de
 * lisibilité, et aspect homogène quelle que soit la couleur du rôle.
 *
 * À distinguer de `RoleBadge`, qui représente les charges constitutionnelles
 * d'édition (Dauphin, Régent…) et ne dépend pas de Discord.
 */
export default function DiscordRoleBadge({
  name,
  color,
}: {
  name: string;
  /** Couleur hexadécimale du rôle, telle que renvoyée par l'API Discord. */
  color?: string | null;
}) {
  // On n'accepte qu'un hexadécimal : une valeur aberrante de l'API ne doit pas
  // se retrouver injectée telle quelle dans un style CSS.
  const hex =
    typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color) ? color : null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-night-600 bg-night-800 px-2.5 py-1 text-xs text-ink-200"
      title={hex ? `Rôle Discord — couleur ${hex}` : "Rôle Discord"}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: hex ?? "rgb(var(--bronze-400))" }}
      />
      {name}
    </span>
  );
}
