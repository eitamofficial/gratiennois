"use client";

import { useState } from "react";

interface Props {
  src: string;
  /** Vide pour une image purement décorative. */
  alt: string;
  /** Largeur du cadre, en classes Tailwind (`w-14`, `w-full`…). */
  widthClass?: string;
  /** Classes supplémentaires du cadre. */
  className?: string;
  /** Ratio appliqué avant le chargement de l'image (évite tout saut de mise en page). */
  defaultRatio?: number;
  /** `lazy` par défaut ; `eager` pour une image au-dessus de la ligne de flottaison. */
  loading?: "lazy" | "eager";
  /**
   * Priorité de téléchargement. `high` sur l'image de contenu (le drapeau
   * d'ouverture) : le navigateur la récupère avant tout le reste, ce qui
   * améliore le temps d'affichage de la page.
   */
  fetchPriority?: "high" | "low" | "auto";
  /**
   * Dimensions réelles connues à l'avance (le drapeau fait 640×400). Les
   * declarer reserve la bonne place dans la page avant même le chargement ;
   * le ratio mesuré au `onLoad` reste prioritaire s'il diffère.
   */
  width?: number;
  height?: number;
}

/**
 * Image encadrée dont le cadre **épouse exactement** l'image.
 *
 * Le problème résolu : poser un drapeau 8/5 dans un cadre carré (`object-cover`)
 * le rogne, et le poser dans un cadre carré « contain » laisse des bandes vides
 * — dans les deux cas, le cadre ne borde pas le drapeau. Ici :
 *
 *   - le cadre prend le ratio **naturel** de l'image, mesuré au chargement ;
 *   - avant la mesure, un ratio par défaut évite tout saut de mise en page ;
 *   - `object-contain` garantit qu'aucun pixel n'est jamais coupé, même si le
 *     ratio mesuré arrive tard ;
 *   - les attributs `width`/`height` donnent au navigateur la taille intrinsèque
 *     sans attendre le CSS (utile pour le calcul du poids de l'image) ;
 *   - `decoding="async"` libère le fil principal : la page s'affiche même si le
 *     déchiffrement de l'image est lent.
 *
 * Le composant est client (il mesure), mais son premier rendu est **identique
 * au rendu serveur** : l'état initial ne dépend que des props, la mise à jour
 * arrive dans `onLoad`, donc aucune divergence d'hydratation n'est possible.
 */
export default function FramedImage({
  src,
  alt,
  widthClass = "w-full",
  className = "",
  defaultRatio = 8 / 5,
  loading = "lazy",
  fetchPriority,
  width,
  height,
}: Props) {
  const [ratio, setRatio] = useState(
    width && height ? width / height : defaultRatio,
  );

  return (
    <span
      className={`inline-block max-w-full overflow-hidden rounded-lg border border-gold-500/40 bg-night-900/70 p-1 shadow-glow-gold ${widthClass} ${className}`}
    >
      <span className="block w-full" style={{ aspectRatio: String(ratio) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setRatio(image.naturalWidth / image.naturalHeight);
            }
          }}
          className="h-full w-full object-contain"
        />
      </span>
    </span>
  );
}
