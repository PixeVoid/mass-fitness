"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * A link that fetches the page when you look like you're about to click it.
 *
 * Next prefetches links by default, but for a `force-dynamic` route it only
 * prefetches the loading boundary — the skeleton, not the data. Every page a
 * signed-in member touches is force-dynamic, so the click still paid for the
 * whole render.
 *
 * The obvious fix, `prefetch={true}`, is worse than it looks: Next prefetches
 * on *viewport entry*, so a nav bar with eight links would render eight pages
 * on the server every time anyone loaded any page. That is not speed, it is
 * eight times the database load to save one click.
 *
 * Intent is the better trigger. A pointer entering a link, a finger touching
 * it, or a keyboard focusing it are all ~100–300ms ahead of the click, and by
 * then the payload is on its way — so it arrives as the navigation starts.
 * Nothing is fetched for a link nobody reaches for.
 *
 * Fires once per mount. `router.prefetch` is idempotent in the router's cache,
 * but there is no reason to ask twice for a link someone waggles the mouse
 * over.
 */
export default function FastLink({
  href,
  children,
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<typeof Link>, "href" | "prefetch">) {
  const router = useRouter();
  const asked = useRef(false);

  const warm = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    router.prefetch(href);
  }, [router, href]);

  return (
    <Link
      href={href}
      // Off, so Next does not prefetch this on viewport entry as well. The
      // handlers below are the whole prefetch strategy for this link.
      prefetch={false}
      onPointerEnter={warm}
      onFocus={warm}
      // Touch has no hover. `touchstart` fires well before the click a tap
      // becomes, which is most of the win on a phone.
      onTouchStart={warm}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}
