/**
 * GET /api/wordpress/oauth/start
 *
 * Mints a signed state, sets it as an HttpOnly cookie, and redirects to
 * WordPress.com. All logic lives in ../../../../lib/handlers.ts so it can be
 * tested without a server.
 */

import { handleStart } from "../../../lib/handlers";
import type { BootstrapRequest, BootstrapResponse } from "../../../lib/http";

export default function handler(request: BootstrapRequest, response: BootstrapResponse): void {
  handleStart(request, response);
}
