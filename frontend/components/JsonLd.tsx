/**
 * Structured data.
 *
 * Deliberately no Organization node. NOVRA Intelligence is a masthead — a
 * publication name — not a legal entity, and emitting Organization schema would
 * assert to search engines that a company exists. The publisher is the Person,
 * which is both true and what lets the author's authority accrue to a real,
 * named human. No sameAs profiles are invented either.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from typed CMS data, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
