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

export interface SiteContent {
  generatedAt: string;
  articles: Article[];
  pages: {
    home: HomeCopy;
    insights: InsightsCopy;
    research: ResearchCopy;
    technology: TechnologyCopy;
    about: AboutCopy;
    contact: ContactCopy;
  };
}
