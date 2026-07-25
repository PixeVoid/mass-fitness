import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db-types";
import { assertPublicSupabaseEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client. **Bypasses RLS completely.**
 *
 * Use only where the app must write on a user's behalf and the user themselves
 * must not be able to: activating a subscription after a payment callback,
 * writing chat logs, admin reads across all rows. Every call site is
 * responsible for its own authorisation check first — there is no database
 * safety net behind this client.
 *
 * The `server-only` import above turns any accidental client-component import
 * into a build error rather than a leaked key.
 */
export function createAdminClient() {
  const { url } = assertPublicSupabaseEnv();

  return createSupabaseClient<Database>(url, serverEnv.supabaseServiceRoleKey, {
    auth: {
      // No session to persist and nothing to refresh — this client is not
      // acting as a user, and a background refresh timer in a serverless
      // function is just a leak.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
