import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles-store";
import { CATEGORY_LIST } from "@/lib/constants";
import { siteUrl as getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const articles = await getPublishedArticles();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/wiki`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/constitution`, changeFrequency: "monthly", priority: 0.95 },
    { url: `${baseUrl}/personnalites`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/institutions`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/tags`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/plan`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/recherche`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/credits`, changeFrequency: "monthly", priority: 0.4 },
    ...CATEGORY_LIST.map((category) => ({
      url: `${baseUrl}/wiki/categorie/${category.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/wiki/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...articlePages];
}
