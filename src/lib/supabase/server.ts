import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db-types";
import { assertPublicSupabaseEnv } from "@/lib/env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Uses the anon key, so RLS still applies — this is the user's
 * own connection, not a privileged one.
 *
 * Must be created per request, never hoisted to a module-level singleton: the
 * cookie store it closes over belongs to one request.
 */
export async function createClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies — the response headers are
          // already committed by the time they render. Swallowing this is the
          // documented pattern: proxy.ts refreshes the session on every
          // request, so a token that could not be written here is rewritten
          // there on the next navigation.
        }
      },
    },
  });
}
