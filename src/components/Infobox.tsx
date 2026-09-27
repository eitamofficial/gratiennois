import type { ArticleInfobox } from "@/lib/types";
import FramedImage from "./FramedImage";

interface Props {
  infobox: ArticleInfobox;
  /** Replie l'encadré dans un `<details>` (mobile) au lieu d'un bloc libre. */
  collapsible?: boolean;
  className?: string;
  /** Titre de l'article, utilisé en en-tête d'encadré et pour l'accessibilité. */
  title: string;
}

const boxClass =
  "overflow-hidden rounded-lg border border-night-500 bg-night-800/70 shadow-card";

/**
 * Boîte d'informations — l'encadré de synthèse très caractéristique de
 * Wikipédia : bandeau de titre, illustration, données clés, mention de source.
 *
 * Choix techniques :
 *   - **composant serveur** : aucune logique client, donc aucun risque
 *     d'écart d'hydratation ;
 *   - **valeurs en texte React** : tout contenu est échappé par React, l'encadré
 *     ne peut pas exécuter de balise ni de script même si la base est corrompue
 *     (la validation serveur refuse par ailleurs toute URL d'image externe) ;
 *   - **repli mobile sans JavaScript** : sous 1280 px l'encadré est un
 *     `<details>` natif, replié pour ne pas écraser le début de l'article ; à
 *     partir de 1280 px c'est la colonne latérale (jamais repliée) qui prend le
 *     relais. Les deux rendus portent le même contenu, l'un caché en `display:
 *     none` donc invisible aux lecteurs d'écran quand il ne s'applique pas.
 */
export default function Infobox({ infobox, collapsible, className, title }: Props) {
  const heading = infobox.caption ?? title;
  const tableCaption = `${heading} — données clés`;

  const body = (
    <div className={boxClass}>
      {/* Bandeau de titre : fond plein, texte centré — l'allure des
          en-têtes d'encadrés d'une encyclopédie imprimée. */}
      <div className="border-b border-night-500 bg-night-700/80 px-4 py-2.5 text-center">
        <p className="font-sans text-sm font-bold leading-snug text-gold-100">
          {heading}
        </p>
        {infobox.caption ? (
          <p className="mt-0.5 text-xs text-bronze-400">{title}</p>
        ) : null}
      </div>

      {infobox.imageUrl ? (
        <figure className="flex flex-col items-center border-b border-night-600 px-3 py-3">
          {/* Le cadre épouse l'image (ratio mesuré au chargement) : le drapeau
              n'est jamais rogné et ne flotte pas dans un vide. */}
          <FramedImage
            src={infobox.imageUrl}
            alt={infobox.imageAlt ?? ""}
            widthClass="w-full"
            className="shadow-none"
          />
          {infobox.imageCaption ? (
            <figcaption className="mt-2 text-center text-xs leading-snug text-slate-400">
              {infobox.imageCaption}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {infobox.fields.length > 0 ? (
        // `table-fixed` + césure `anywhere` : une valeur très longue se replie
        // dans la colonne au lieu de faire déborder l'encadré.
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">{tableCaption}</caption>
          <tbody>
            {infobox.fields.map((field, index) => (
              <tr
                key={`${field.label}-${index}`}
                // Lignes alternées : l'œil retrouve la ligne correspondante
                // d'un libellé à l'autre sans avoir à le relire.
                className="border-b border-night-700/70 odd:bg-night-900/40 last:border-0"
              >
                <th
                  scope="row"
                  className="w-2/5 [overflow-wrap:anywhere] align-top px-3 py-2 text-xs font-semibold leading-snug text-bronze-400"
                >
                  {field.label}
                </th>
                <td className="[overflow-wrap:anywhere] align-top px-3 py-2 leading-snug text-slate-200">
                  {field.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {infobox.footer ? (
        <p className="border-t border-night-500 bg-night-900/60 px-3 py-2 text-xs leading-relaxed text-slate-400">
          {infobox.footer}
        </p>
      ) : null}
    </div>
  );

  if (!collapsible) return <div className={className}>{body}</div>;

  return (
    <details className={className}>
      <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-night-600 bg-night-800/60 px-4 py-3 text-sm font-medium text-gold-200">
        <span aria-hidden="true">▸</span>
        <span className="flex-1">{heading}</span>
        <span className="text-xs font-normal text-bronze-400">données clés</span>
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
