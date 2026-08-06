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
export function started<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {
    // Deliberately empty. The real await, if it happens, sees the rejection;
    // this exists only so the runtime does not consider it unobserved.
  });
  return promise;
}
