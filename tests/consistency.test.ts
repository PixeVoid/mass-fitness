import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_DURATIONS, PLAN_TIERS } from "@/lib/plans";
import { isAuthedRoute } from "@/lib/routes";

/**
 * The bugs that live between files rather than inside one.
 *
 * Every finding of this shape so far — robots.txt listing a route that never
 * existed, the sitemap advertising two 404s, seed.sql promoting admins by a
 * column that stopped being the account key — was invisible to typecheck,
 * lint and every unit test, because each file was internally fine.
 */

const root = join(__dirname, "..");
const readRaw = (path: string) => readFileSync(join(root, path), "utf8");

/**
 * Comments are stripped before anything is matched.
 *
 * Without this the first draft of these tests reported four defects that were
 * all prose: a path named inside a comment explaining that it had been
 * removed, a `process.env.FOO` in a docstring, the words "security definer"
 * in a sentence about security definer functions. A consistency test that
 * reads commentary as code is worse than none — it cries wolf.
 */
const read = (path: string) =>
  readRaw(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*--.*$/gm, "");

const routeFiles = (() => {
  const found: string[] = [];
  const walk = (dir: string, urlPath: string) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // Route groups and private folders do not appear in the URL.
      if (name.startsWith("_")) continue;
      const segment = name.startsWith("(") ? "" : `/${name}`;
      const nextUrl = `${urlPath}${segment}`;
      const dirEntries = readdirSync(join(root, dir, name));
      if (dirEntries.includes("page.tsx")) found.push(nextUrl || "/");
      walk(join(dir, name), nextUrl);
    }
  };
  walk("src/app", "");
  if (readdirSync(join(root, "src/app")).includes("page.tsx")) found.push("/");
  return found;
})();

describe("sitemap", () => {
  it("only lists routes that exist", () => {
    const source = read("src/app/sitemap.ts");
    const urls = [...source.matchAll(/\$\{siteUrl\}(\/[a-z0-9-/]*)`/g)]
      .map((m) => m[1])
      .filter((u) => !u.includes("${"));

    for (const url of urls) {
      expect(routeFiles, `sitemap lists ${url}`).toContain(url);
    }
  });

  it("lists no route that is behind auth", () => {
    const source = read("src/app/sitemap.ts");
    const urls = [...source.matchAll(/\$\{siteUrl\}(\/[a-z0-9-/]*)`/g)].map((m) => m[1]);
    for (const url of urls) {
      expect(isAuthedRoute(url), `${url} is gated but in the sitemap`).toBe(false);
    }
  });
});

describe("robots", () => {
  it("disallows every gated area", () => {
    const source = read("src/app/robots.ts");
    const disallowed = [...source.matchAll(/"(\/[a-z0-9-/]*)"/g)].map((m) => m[1]);

    // Every page route that requires auth should be covered by some entry.
    for (const route of routeFiles.filter(isAuthedRoute)) {
      const covered = disallowed.some(
        (rule) => route === rule || route.startsWith(`${rule}/`),
      );
      expect(covered, `robots.txt does not cover ${route}`).toBe(true);
    }
  });

  it("does not disallow a path that is not a route", () => {
    const source = read("src/app/robots.ts");
    const disallowed = [...source.matchAll(/"(\/[a-z0-9-/]*)"/g)]
      .map((m) => m[1])
      // /api has no page.tsx but is a real route tree.
      .filter((p) => p !== "/api" && p !== "/auth/callback");

    for (const rule of disallowed) {
      const matches = routeFiles.some(
        (route) => route === rule || route.startsWith(`${rule}/`),
      );
      expect(matches, `robots.txt disallows ${rule}, which is not a route`).toBe(true);
    }
  });
});

describe("env", () => {
  it("documents every variable the server actually reads", () => {
    const env = read("src/lib/env.ts");
    const example = read(".env.example");

    const referenced = [...env.matchAll(/process\.env\.([A-Z0-9_]+)/g)]
      .map((m) => m[1])
      // NODE_ENV is supplied by the runtime, not by the operator.
      .filter((name) => name !== "NODE_ENV");

    for (const name of new Set(referenced)) {
      expect(example, `.env.example is missing ${name}`).toContain(name);
    }
  });

  it("documents no variable that nothing reads", () => {
    const env = read("src/lib/env.ts");
    const example = read(".env.example");
    const declared = [...example.matchAll(/^([A-Z0-9_]+)=/gm)].map((m) => m[1]);

    const sourceAll = [
      env,
      read("src/lib/rate-limit-db.ts"),
      read("src/proxy.ts"),
      read("src/lib/payments/mock.ts"),
    ].join("\n");

    for (const name of declared) {
      expect(sourceAll, `.env.example declares ${name}, which nothing reads`)
        .toContain(name);
    }
  });
});

describe("migrations", () => {
  const files = readdirSync(join(root, "supabase/migrations")).sort();

  it("are numbered without gaps or duplicates", () => {
    const numbers = files.map((f) => Number(f.slice(0, 4)));
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("declare the same plan tiers and durations as the code", () => {
    const init = read("supabase/migrations/0001_init.sql");
    for (const tier of PLAN_TIERS) {
      expect(init, `migration is missing tier ${tier}`).toContain(`'${tier}'`);
    }
    for (const duration of PLAN_DURATIONS) {
      expect(init, `migration is missing duration ${duration}`)
        .toContain(`'${duration}'`);
    }
  });

  it("enable row level security on every table they create", () => {
    const all = files.map((f) => read(`supabase/migrations/${f}`)).join("\n");
    const created = [...all.matchAll(/create table if not exists public\.(\w+)/g)]
      .map((m) => m[1]);

    for (const table of new Set(created)) {
      // Whitespace-tolerant: the migrations align these into a column.
      const pattern = new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
      );
      expect(pattern.test(all), `${table} has no RLS`).toBe(true);
    }
  });

  it("pin search_path on every security definer function", () => {
    // A definer function inherits the caller's search_path, which is how a
    // privilege-escalation via a shadowed table happens.
    const all = files.map((f) => read(`supabase/migrations/${f}`)).join("\n");
    const definers = all.split("security definer").length - 1;
    const pinned = all.split("set search_path").length - 1;
    expect(pinned).toBeGreaterThanOrEqual(definers);
  });
});

describe("seed", () => {
  it("does not key accounts on phone — email has been the login since 0002", () => {
    const seed = read("supabase/seed.sql");
    expect(seed).not.toMatch(/profiles where phone/i);
  });
});
