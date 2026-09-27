import type { MetadataRoute } from "next";
import { siteUrl as getSiteUrl } from "@/lib/site-url";

// Généré à chaque requête : le fichier est minuscule, et le figer à la
// compilation conserverait dans `robots.txt` l'URL d'un ancien déploiement
// dès qu'un domaine change.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/wiki", "/constitution", "/personnalites", "/recherche"],
        disallow: ["/admin", "/connexion", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
