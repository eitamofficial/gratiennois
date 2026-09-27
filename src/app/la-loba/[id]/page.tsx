import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Porte from "@/components/PorteOeuf";
import { OEUFS, trouverOeuf } from "@/lib/oeufs";

/**
 * Les quinze pages, une seule route.
 *
 * Chaque œuf a sa propre URL, ce qui les rend réellement distinctes : elles ont
 * chacune leur adresse, leur titre d'onglet et leur historique de navigation. En
 * revanche, elles partagent le même gabarit, et le dupliquer quinze fois
 * reviendrait à maintenir quinze fois le même fichier.
 *
 * Cette route n'est ni dans le sitemap, dont la liste est écrite à la main, ni
 * dans la navigation. Elle est déclarée sans indexation, et son contenu n'est
 * servi qu'après ouverture de la porte.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return OEUFS.map((oeuf) => ({ id: oeuf.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const oeuf = trouverOeuf(id);
  if (!oeuf) return { title: "Page introuvable" };
  return {
    // Le titre d'onglet reprend celui de la page fermée : il ne donne rien à
    // deviner à qui découvre l'adresse par hasard.
    title: "Page introuvable",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PageOeuf({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!trouverOeuf(id)) notFound();
  return <Porte id={id} />;
}
