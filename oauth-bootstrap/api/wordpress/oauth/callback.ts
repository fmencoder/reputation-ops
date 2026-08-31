/**
 * GET /api/wordpress/oauth/callback
 *
 * Verifies state, exchanges the code server-side, validates the token with a
 * read-only call, and shows it once. Nothing is logged: no code, no secret, no
 * token.
 */

import { handleCallback } from "../../../lib/handlers";
import type { BootstrapRequest, BootstrapResponse } from "../../../lib/http";

export default async function handler(request: BootstrapRequest, response: BootstrapResponse): Promise<void> {
  await handleCallback(request, response);
}
