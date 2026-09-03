import type { Metadata, Viewport } from "next";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { asset } from "@/lib/media";
import { websiteSchema, personSchema } from "@/lib/seo";
import "@/styles/global.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Intelligent systems. Digital infrastructure.`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.author.name, url: `${site.url}/about/` }],
  robots: { index: true, follow: true },
  icons: { icon: asset("/assets/novra-nmark.webp") },
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Inter is loaded from Google Fonts rather than bundled: the build runs
          in an environment without egress, and next/font fetches at build time,
          so bundling it would make the build depend on the network. The stack
          falls back to the platform UI face, which is metrically close enough
          that nothing reflows.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- the rule
            targets the pages router, where a font link in a page loads for that
            page only. This is the App Router root layout: it wraps every route. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Masthead />
        <main id="main">{children}</main>
        <Footer />
        <JsonLd data={[websiteSchema, { "@context": "https://schema.org", ...personSchema }]} />
      </body>
    </html>
  );
}
