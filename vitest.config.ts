import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit and render tests, no database.
 *
 * Everything under test is either pure — the access rules, the pricing
 * arithmetic, the join window, phone normalisation — or a component that takes
 * props and returns markup. That is where the bugs actually were: the
 * one-to-one tier leaking into group classes, a class list capped before it
 * was filtered, a score whose parts did not add up to itself. None of them
 * needed Supabase to reproduce, and tests that stood it up would be slower and
 * would fail for reasons unrelated to the code.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  // esbuild handles the JSX rather than @vitejs/plugin-react, which does not
  // yet support the Vite 7 that vitest pulls in. The component tests render to
  // a string with react-dom/server, so nothing needs Fast Refresh or a DOM.
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The `server-only` package exists to make the *bundler* fail when a
      // server module is pulled into a client one. Under vitest there is no
      // such boundary, so it is stubbed — the alternative is contorting the
      // source to avoid a guard that is doing its job correctly in the build.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
