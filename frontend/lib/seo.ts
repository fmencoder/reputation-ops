import type { Metadata } from "next";
import { site } from "./site";
import type { Article } from "./cms/types";

const OG_IMAGE = "/assets/share-card.webp";

export function pageMetadata({
  title,
  description,
  path,
  image = OG_IMAGE,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${site.url}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: site.name,
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: site.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function articleMetadata(article: Article): Metadata {
  const url = `${site.url}${article.path}`;
  const image = article.hero.src || OG_IMAGE;
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      siteName: site.name,
      title: article.title,
      description: article.excerpt,
      url,
      publishedTime: article.date,
      modifiedTime: article.modified,
      authors: [site.author.name],
      images: [{ url: image, width: article.hero.width || 1200, height: article.hero.height || 630, alt: article.hero.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [image],
    },
  };
}

export const personSchema = {
  "@type": "Person",
  "@id": `${site.url}/about/#fredrick-mendez`,
  name: site.author.name,
  jobTitle: site.author.role,
  description: site.author.descriptor,
  url: `${site.url}/about/`,
} as const;

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  name: site.name,
  url: `${site.url}/`,
  description: site.description,
  inLanguage: "en-US",
  publisher: { "@id": `${site.url}/about/#fredrick-mendez` },
} as const;

export function articleSchema(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${site.url}${article.path}#article`,
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.modified,
    inLanguage: "en-US",
    articleSection: article.category,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}${article.path}` },
    author: { "@id": `${site.url}/about/#fredrick-mendez` },
    publisher: { "@id": `${site.url}/about/#fredrick-mendez` },
    ...(article.hero.src
      ? {
          image: {
            "@type": "ImageObject",
            url: `${site.url}${article.hero.src}`,
            width: article.hero.width,
            height: article.hero.height,
          },
        }
      : {}),
    ...(article.sources.length
      ? { citation: article.sources.map((source) => ({ "@type": "CreativeWork", name: source.text, url: source.url })) }
      : {}),
  };
}
