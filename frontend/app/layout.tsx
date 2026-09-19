import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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

/*
 * Inter, self-hosted.
 *
 * It used to come from the Google Fonts CDN via a <link> in <head>, on the
 * belief that the build environment had no egress. That was wrong — the egress
 * policy is per-host, and both fonts.googleapis.com and fonts.gstatic.com are
 * reachable — and the CDN link was costing more than it saved. Lighthouse put
 * it at 780ms of render-blocking on mobile, it was the only browser console
 * error on the site, and its in-flight request was what made every page
 * ineligible for the back/forward cache.
 *
 * next/font downloads the files at build time and serves them from this
 * origin, which removes all three. It also removes a third-party request that
 * disclosed every visitor's IP address to Google on page load — worth caring
 * about for a site whose stated audience is European and institutional — and
 * lets the CSP drop two external origins.
 *
 * The cost is that the build now needs network access to fetch the font. Vercel
 * builds have it, and the alternative was paying for it on every page load
 * instead of once per build.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  /*
   * preload stays on, which is the default, and the reason is measured rather
   * than assumed. Turning it off to stop the 48KB latin subset competing with
   * the hero image did not move LCP at all (2.7s either way) and broke CLS:
   * 0 became 0.129 on the homepage and 0.21 on an article, because the swap
   * from the system UI face to Inter reflows the text. Mobile performance fell
   * from 96 to 92 and from 96 to 87 on those two pages.
   *
   * So the older claim in this file that the fallback is "metrically close
   * enough that nothing reflows" is wrong. It reflows measurably, and the
   * preload is what keeps the reflow from being visible.
   */
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
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
