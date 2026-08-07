/**
 * Marks a promise's rejection as handled without consuming it.
 *
 * Several pages start their queries *before* awaiting the auth check, so the
 * two overlap instead of queueing. That is worth two round trips per page —
 * but it means an in-flight query can still be pending when `requireAdmin()`
 * throws, and a promise that rejects with nobody awaiting it is an unhandled
 * rejection, which Node can be configured to treat as fatal.
 *
 * `.catch()` returns a *new* promise, so attaching one here marks the original
 * as handled while leaving it untouched: awaiting it later still gets the
 * value, or still throws, exactly as before.
 */
export function started<T>(work: PromiseLike<T>): Promise<T> {
  // `Promise.resolve` rather than taking a `Promise` directly, because a
  // Supabase query builder is a *thenable*, not a promise: it has `.then` but
  // no `.catch`, and — the part that matters — it does not send the request
  // until something subscribes to it. Assigning one to a variable and awaiting
  // it later therefore starts nothing, which would make this helper appear to
  // work while quietly doing the opposite of what it says. Resolving it here
  // both normalises the type and is the subscription that kicks it off.
  const promise = Promise.resolve(work);

  promise.catch(() => {
    // Deliberately empty. The real await, if it happens, sees the rejection;
    // this exists only so the runtime does not consider it unobserved.
  });

  return promise;
}
