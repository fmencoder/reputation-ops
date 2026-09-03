import type { MetadataRoute } from "next";
import { getArticles } from "@/lib/cms";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();
  const pages = site.nav.map((item) => ({
    url: `${site.url}${item.href}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: item.href === "/" ? 1 : 0.7,
  }));
  return [
    ...pages,
    ...articles.map((article) => ({
      url: `${site.url}${article.path}`,
      lastModified: new Date(article.modified),
      changeFrequency: "yearly" as const,
      priority: 0.8,
    })),
  ];
}
