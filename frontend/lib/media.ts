/**
 * Where images are served from.
 *
 * The repository holds every asset in public/assets and that is the default.
 * A deployment can instead be pointed at the WordPress Media Library — the
 * same files, already public, already the origin the CMS records — by setting
 * NEXT_PUBLIC_MEDIA_ORIGIN. The preview build uses that so the deployment can
 * be created without pushing binaries through the deploy API; production
 * serves them from the frontend's own origin.
 */
import mediaMap from "../content/media-map.json";

const ORIGIN = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.replace(/\/$/, "") ?? "";

/** Media Library URL -> local path, which is the inverse of what we need here. */
const REMOTE: Record<string, string> = Object.fromEntries(
  Object.entries(mediaMap as Record<string, string>)
    .filter(([url]) => url.startsWith("http"))
    .map(([url, local]) => [local, url]),
);

export function asset(path: string): string {
  if (!ORIGIN) return path;
  const remote = REMOTE[path];
  if (remote) return remote;
  // Assets with no Media Library counterpart still resolve against the origin
  // rather than silently 404ing against a frontend that did not ship them.
  return `${ORIGIN}${path}`;
}
