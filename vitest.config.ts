import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest previously ran on defaults, which was enough while every test
 * imported by relative path. The contact-form tests import the route handler
 * itself, and app code uses the `@/` alias that frontend/tsconfig.json
 * defines — an alias Vite knows nothing about until it is told.
 *
 * Mapping it here rather than rewriting the route to use relative imports: the
 * alias is the convention throughout app/ and components/, and a module that
 * has to be written differently in order to be testable is a module whose test
 * is not exercising what ships.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend", import.meta.url)),
    },
  },
});
