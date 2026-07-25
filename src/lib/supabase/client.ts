"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db-types";
import { assertPublicSupabaseEnv } from "@/lib/env";

/**
 * Browser client. Only ever sees the anon key, so every query it makes is
 * subject to RLS.
 *
 * `createBrowserClient` already memoises per set of args, so calling this on
 * each render is cheap and there is no singleton to keep in sync.
 */
export function createClient() {
  const { url, anonKey } = assertPublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
