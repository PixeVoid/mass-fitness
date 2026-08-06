import { getHeaderIdentity } from "@/lib/auth/dal";
import Nav from "@/components/Nav";

/**
 * The site header, on every page that isn't a focused auth flow.
 *
 * Nav itself is a client component (scroll spy, mobile sheet), so the session
 * read has to happen on this side of the boundary and be handed down. Doing it
 * on the server is the point: the header renders with the right name in the
 * initial HTML instead of flashing "Login" at an already-signed-in member
 * while a client-side session check resolves.
 *
 * Reading the session opts the route into dynamic rendering. That is already
 * true of every page this renders on — each one reads cookies for pricing,
 * the profile, or both — and on the no-cookie path `getHeaderIdentity` returns
 * without touching Supabase at all, so an anonymous visitor pays for a render
 * and nothing else.
 */
export default async function SiteHeader() {
  const identity = await getHeaderIdentity();
  return <Nav identity={identity} />;
}

/**
 * Clearance for the fixed header, for pages whose content starts at the top of
 * the document. The landing page doesn't need it — its hero is designed to run
 * underneath the pills.
 */
export function HeaderSpacer() {
  return <div aria-hidden="true" className="h-28 sm:h-32" />;
}
