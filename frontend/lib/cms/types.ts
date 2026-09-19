/** The shape the frontend consumes. Nothing WordPress-specific survives here. */

export interface Figure {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Source {
  text: string;
  url: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  permalink: string;
  /** The public path, trailing slash included: /2026/08/31/slug/ */
  path: string;
  date: string;
  modified: string;
  dateDisplay: string;
  dateMachine: string;
  readingTime: string;
  /** Editorial kicker — Reliability, Governance, Architecture. */
  topic: string;
  /** The WordPress category. There is exactly one: Analysis. */
  category: string;
  hero: Figure;
  /** Semantic HTML: presentation stripped, structure kept. */
  bodyHtml: string;
  sources: Source[];
}

export interface Headline {
  lead: string;
  accent: string;
}

export interface ProseSection {
  heading: string;
  paragraphs: string[];
}

export interface Card {
  icon: string;
  title: string;
  body: string;
}

export interface PageCopy {
  eyebrow: string;
  headline: Headline;
  lead: string;
}

export interface HomeCopy extends PageCopy {
  domains: string[];
  /**
   * The pathway into the institutional pages. It sits below the approved hero
   * composition rather than inside it: the board's panel A is the homepage's
   * visual contract, and widening the hero to carry a second positioning is
   * what would break it.
   */
  institutional: {
    label: string;
    heading: string;
    body: string;
    links: { label: string; href: string; note: string }[];
  };
}

export interface InsightsCopy extends PageCopy {
  domains: string[];
}

export interface ResearchCopy extends PageCopy {
  intro: ProseSection;
  openQuestions: string;
}

export interface TechnologyCopy extends PageCopy {
  cards: Card[];
  convergence: ProseSection[];
}

export interface AboutCopy extends PageCopy {
  identity: { name: string; role: string; descriptor: string };
  portrait: Figure;
  researchFocus: Card[];
  profile: ProseSection[];
  manifesto: { eyebrow: string; headline: Headline; paragraphs: string[] };
  publication: { kicker: string; title: string; body: string };
}

export interface ContactCopy extends PageCopy {
  email: string;
  note: string;
}

/**
 * A capability area. `icon` is a glyph key resolved by CapabilityIcon, not a
 * file path: these marks are drawn inline so a new capability never waits on
 * an uploaded asset, and so they inherit the palette rather than baking it in.
 */
export interface Capability {
  icon: string;
  title: string;
  body: string;
}

/**
 * Capability and global-development copy both carry a `standing` note.
 *
 * That field is not decoration and must not be dropped to tighten a layout.
 * These two pages describe what the practice can do, and a reader evaluating a
 * contractor will read capability as past performance unless the page says
 * otherwise in its own voice. The note is where it says otherwise.
 */
export interface CapabilitiesCopy extends PageCopy {
  areas: Capability[];
  method: ProseSection[];
  standing: string;
}

export interface GlobalDevelopmentCopy extends PageCopy {
  areas: Capability[];
  context: ProseSection[];
  standing: string;
  engagement: { heading: string; body: string };
}

export interface SiteContent {
  generatedAt: string;
  articles: Article[];
  pages: {
    home: HomeCopy;
    insights: InsightsCopy;
    research: ResearchCopy;
    technology: TechnologyCopy;
    capabilities: CapabilitiesCopy;
    globalDevelopment: GlobalDevelopmentCopy;
    about: AboutCopy;
    contact: ContactCopy;
  };
}
