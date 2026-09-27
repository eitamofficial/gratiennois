import type { Metadata } from "next";
import Sanctuaire from "@/components/Sanctuaire";
import MobileNav from "@/components/MobileNav";

/**
 * La route de l'œuf.
 *
 * Elle n'apparaît nulle part : ni dans le plan du site, ni dans le sitemap,
 * dont la liste est écrite à la main, ni dans la navigation. Les robots sont
 * priés de l'ignorer, et le contenu lui-même ne s'affiche qu'après ouverture de
 * la porte, contrôlée dans le navigateur du visiteur.
 */
export const metadata: Metadata = {
  // Le titre affiché dans l'onglet reprend celui de la page fermée : il ne
  // donne rien à deviner à qui découvre l'URL par hasard.
  title: "Page introuvable",
  robots: { index: false, follow: false, nocache: true },
};

export default function PageLoba() {
  return (
    <>
      <MobileNav />
      <Sanctuaire />
    </>
  );
}
