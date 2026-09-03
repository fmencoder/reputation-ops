/** Facts about the publication. Nothing here may be invented. */
export const site = {
  name: "NOVRA Intelligence",
  wordmark: "NOVRA",
  suffix: "Intelligence",
  url: "https://novraintelligence.com",
  description:
    "Research and perspectives on artificial intelligence, autonomous systems, blockchain infrastructure, financial technology, and emerging digital systems.",
  email: "contact@novraintelligence.com",
  author: {
    name: "Fredrick Mendez",
    credential: "Fredrick Mendez, MBA",
    role: "Founder & Research Architect",
    descriptor: "Technology Executive, AI Strategist & Emerging Technology Innovator",
    url: "https://novraintelligence.com/about/#fredrick-mendez",
  },
  nav: [
    { label: "Home", href: "/" },
    { label: "Insights", href: "/insights/" },
    { label: "Research", href: "/research/" },
    { label: "Technology", href: "/technology/" },
    { label: "About", href: "/about/" },
    { label: "Contact", href: "/contact/" },
  ],
} as const;

/*
 * The WordPress.com site the CMS content comes from. Only ever read from:
 * this frontend never writes to WordPress, and the migration explicitly leaves
 * the WordPress deployment serving production until the founder approves.
 */
export const cms = {
  blogId: 257059568,
  restBase: "https://public-api.wordpress.com/wp/v2/sites/257059568",
} as const;
