# Mass Fitness — Master Build Plan

**Tagline:** "Fitness From Home"
**Owner:** Ankit (PixeVoid)
**Purpose of this doc:** This is the single source of truth for building Mass Fitness. Any Claude instance (or human dev) should be able to read this top to bottom and execute a phase without needing to re-derive decisions, ask "which stack should I use," or guess at scope. If something isn't in this doc, stop and ask the user rather than assuming.

---

## Status at a glance

Last updated: 2026-08-06 (post-review). Update this table in the same commit as the work it describes.

| Phase | Status | Notes |
|---|---|---|
| 0 — Project setup & design system | ✅ Done | Next 16 + TS + Tailwind 4 scaffolded; schema + RLS written as a migration. Supabase project itself still needs creating by a human — see "What the user still has to do". |
| 0.5 — SEO foundation | ✅ Done | Metadata API, `sitemap.ts`, `robots.ts`, OG image, JSON-LD all in place. Behind-auth routes now carry `noindex` as well as a robots disallow. |
| 1 — Landing page | ✅ Done | 3D hero, features, pricing, contact. |
| 2 — Auth + data capture | ✅ Code complete | **Switched from phone-OTP to email-OTP + Google OAuth 2026-07-25** — see Section 0.3. Profile capture, protected dashboard. Untested against a live Supabase project. |
| 3 — Subscriptions + PhonePe | 🟡 Code complete, unverified | `/subscribe` checkout, `settleCheckout` idempotent activation, `/api/payments/callback`. The provider sits behind a seam (`src/lib/payments/provider.ts`); `PAYMENT_PROVIDER=mock` walks the whole flow without credentials. **PhonePe's wire details in `phonepe.ts` have never run against a live account** — verify against current docs before taking real money. |
| 4 — Live classes (video) | 🟡 Code complete, unverified | Token route with the paywall gate, plus a two-way room: members publish camera/mic too, both off on join. **Provider now sits behind a seam** (`src/lib/video/provider.ts`) — the access decision is vendor-agnostic and the LiveKit-specific UI is isolated in `components/live/livekit/`. Needs a real project to test; section 3.9's checklist is untouched. |
| 5 — Chatbot (Groq) | ✅ Code complete | `/api/chat` streaming route plus the widget, mounted in the member area. Members-only, with durable Postgres-backed limits (burst + daily cap + duplicate suppression). Logging is unconditional and 12-month retained — see open flag 2. |
| 6 — Admin dashboard | ✅ Code complete | `/admin` — members (roles + manual membership grants), class scheduling, overview. Removes all the hand-written SQL except the first admin promotion. |
| 6.2 — Trainer role | ✅ Code complete | `/coach` — trainers schedule, edit and cancel their **own** classes. Ownership is enforced in Postgres (`classes: coach ...` policies), not just in hidden buttons. No delete: cancelling leaves the row visible and marked off. Members, leads, pricing and payments stay admin-only. |
| 6.3 — Class reminders | ✅ Code complete | Countdown banner on the dashboard, plus an email ~30 min ahead via `/api/cron/class-reminders`. Scheduler-agnostic (Vercel Cron, pg_cron + pg_net, anything that can send a bearer token) — Vercel's Hobby tier only allows daily crons, so tying it to one scheduler would have made the feature depend on a billing tier. |
| 6.4 — Training groups | ✅ Code complete | Cohorts with one coach and a hard cap, enforced by a database trigger rather than a count-then-insert. Members pick a group straight after paying; one-to-one is a cohort of one created when they pick a coach, so private sessions reuse every path a group class already has. Classes carry `audience`, the join check and the reminder email both respect it, and coaches get emailed a new member's full assessment — consented at the quiz, not just in the policy. |
| 6.5 — Blog + FAQ | ✅ Code complete | `/blog`, `/blog/[slug]`, `/faq` with FAQPage JSON-LD; both admin-authored from `/admin/blog` and `/admin/faq`. Resolves open flag 3. |
| 7 — Flutter app prep | ⬜ Not started | — |

### Framework note (matters before writing any code)

The project is on **Next.js 16**, which is not the Next.js most training data describes. Read the bundled docs in `node_modules/next/dist/docs/` before writing code — per `AGENTS.md`. The change that has already bitten this codebase:

- **Middleware is now Proxy.** The file is `src/proxy.ts` exporting `proxy()`, not `middleware.ts`. Same execution model, runs on the Node runtime.
- `cookies()`, `headers()`, `params` and `searchParams` are all async and must be awaited.

### What the user still has to do before any of this runs

None of it is code — all of it is account setup, and nothing below can be done from a dev session.

1. **Create the Supabase project**, then run every file in `supabase/migrations/` against it in filename order — `0001_init` … `0010_rate_limits` (SQL editor or `supabase db push`).
2. **Enable Email auth** in Supabase → Authentication → Providers (on by default on new projects, but confirm). No SMS/WhatsApp provider needed — see Section 0.3.
3. **Create a Google OAuth client** and wire it into Supabase → Authentication → Providers → Google. Also see Section 0.3.
4. **Create a LiveKit Cloud project** for the URL, key and secret.
5. **Get a Groq API key.**
6. **Get a Resend API key** and verify a sending domain, for the self-assessment result emails.
7. **Enable pg_cron** (Database → Extensions) so `expire_subscriptions()` and `prune_chat_logs()` run on a schedule. `0006_maintenance.sql` applies without it, but then both need running by hand.
8. **Confirm "linked accounts" is on** so an email signup and a later Google sign-in with the same address are one account, not two.
9. Copy `.env.example` → `.env.local` and fill it in, including `NEXT_PUBLIC_SITE_URL`. Same values go into Vercel's env settings for deploys. `PAYMENT_PROVIDER=mock` until PhonePe credentials exist.
10. **Run migration `0010_rate_limits.sql`** — the self-assessment's rate limiting moved from process memory to Postgres, and the endpoint counts against a table that has to exist.
11. **Set `CRON_SECRET`** and point a scheduler at `/api/cron/class-reminders` every 5 minutes, with `Authorization: Bearer $CRON_SECRET`. Vercel Cron sends it automatically but only allows daily runs on Hobby; pg_cron + pg_net from Supabase works on any tier. Without this, class reminder emails never send — the route refuses to run unauthenticated.
12. **Create at least one training group** at `/admin/groups` before anyone subscribes, and set a one-to-one capacity for any coach who should take private clients. A member who pays with no group available lands on a page telling them to message you — recoverable, but not the first impression you want.
13. **Make yourself an admin**, once — the only step that still needs raw SQL, because the thing that grants admin is the admin panel:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Everything after that (trainers, memberships, classes) is done in `/admin`.

---

## 0.3 Auth channel — decision reversed 2026-07-25: email OTP + Google OAuth, not phone

**Original decision (Section 0) was Supabase phone-OTP.** In practice that meant no login could be tested — not even locally — without a paid SMS/WhatsApp provider or TRAI DLT registration, both of which have day-to-week lead times. That blocked every downstream phase behind an account-setup bottleneck rather than a code one. Superseded by this section; **Section 0's auth row should be read as "Email OTP + Google OAuth," not phone.**

### What ships now

1. **Google OAuth** — the primary path. Free, no provider account beyond Supabase + a Google Cloud OAuth client, and returning users skip the code-entry step entirely.
2. **Email OTP** — the fallback for anyone without (or not wanting to use) a Google account. Free at MVP volume via Supabase's built-in email sending, or a real SMTP provider (Resend, Brevo — both have free tiers) once volume outgrows it.
3. **Phone becomes an ordinary profile field**, captured optionally at onboarding for class reminders and support lookup. It is no longer unique, no longer the account key, and login no longer depends on it — see `supabase/migrations/0002_email_auth.sql`.

Why this ranks above phone OTP for this app specifically: **zero dependency on Indian telecom regulation.** DLT registration (SMS) and WhatsApp Business template approval both gate on entities outside Supabase and outside this codebase. Google OAuth and Supabase email both work the moment the accounts exist — no approval queue.

### One-time setup (both required for the combination to work)

**Email OTP:**
- Supabase → Authentication → Providers → **Email** should already be enabled on a new project (screenshots during setup showed it "Enabled" by default). If not, toggle it on. Nothing else to configure for MVP volume — Supabase's built-in sender covers testing and early traffic.
- **The email template must be edited before login works — this bit us on first test.** Supabase's default "Magic Link" template (Authentication → Email Templates → Magic Link) only renders `{{ .ConfirmationURL }}`, a clickable link. This app's UI asks the user to type in a 6-digit code, which Supabase generates regardless but never shows unless the template also includes `{{ .Token }}`. Add it to the template body, e.g.:
  ```html
  <h2>Your Mass Fitness login code</h2>
  <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
  ```
  The link can stay in the template too (`sendOtp` now passes `emailRedirectTo` pointing at `/auth/callback`, so clicking it works as an alternative to typing the code) — just don't rely on the link alone, since a codeless template leaves the user staring at an email with nothing to type in.
- **Supabase's built-in email sender is rate-limited to a handful per hour and is explicitly not for production.** Once real signups start, connect real SMTP (Resend's free tier is 3,000/month) under Authentication → Providers → Email → SMTP Settings.

**Google OAuth:**
1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project → APIs & Services → Credentials → **Create OAuth client ID** → Web application.
2. Authorised redirect URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback` (Supabase's own callback, not this app's — copy the exact value Supabase shows you in the next step).
3. Copy the generated Client ID and Client Secret into Supabase → Authentication → Providers → **Google**, and enable it.
4. Set `NEXT_PUBLIC_SITE_URL` in `.env.local` (and in Vercel for deploys) to this app's real URL — it's what builds the second-stage redirect back from `/auth/callback` to `/dashboard` or `/onboarding`. `src/app/auth/callback/route.ts` is where that handoff happens.
5. **Consider enabling "linked accounts"** under Supabase → Authentication → Providers → Email settings, so a user who first signs up by email and later clicks "Continue with Google" with the same address lands on one account rather than two. Without it, Supabase does not automatically merge them.

### Testing without any of the above

Supabase's local dev stack (`supabase start`) supports fixed test OTPs via `supabase/config.toml`, but that only helps local development, not a hosted project — hosted Supabase has no test-OTP bypass. For a hosted project the fastest path to a working login is standing up the two providers above; both are same-day setup once you have a Google account and a Supabase project.

### Do not do this

**Unofficial WhatsApp libraries** (Baileys, whatsapp-web.js, and anything else that drives WhatsApp Web with a personal number). Free until the number gets permanently banned — a real risk given this business already prints its WhatsApp number on the landing page for real customer conversations.

**Firebase Phone Auth** would mean running a second auth system alongside Supabase — two user tables, two session models, and the `profiles.id → auth.users.id` foreign key this whole schema is built on stops meaning anything. Not worth it even though it has a free quota.

### If phone OTP becomes worth it again later

WhatsApp OTP via Twilio Verify remains the best *phone-based* option if there's ever a product reason to add it back (e.g., users without email literacy) — no DLT registration needed, and it's consistent with the landing page's existing WhatsApp CTA. SMS via MSG91 is the fallback to that. Neither is blocking anything today.

---

## 0. Locked decisions (do not re-litigate these)

| Area | Decision | Why |
|---|---|---|
| Frontend framework | **Next.js 14+ (App Router) + TypeScript** | Reusable API-route pattern, SSR for SEO on landing page, natural fit for later app work |
| Styling | **Tailwind CSS** | Fast, consistent, works well with design tokens |
| 3D / animation | **React Three Fiber (R3F) + drei + Framer Motion** | Needed for the Dribbble-tier 3D hero the user wants |
| Backend / DB | **Supabase (Postgres + Auth + Storage + Realtime)** | User already knows Supabase; single provider covers auth, DB, and later realtime needs |
| Auth | **Supabase Auth — Email OTP + Google OAuth** (reversed from phone OTP 2026-07-25, see Section 0.3) | Phone OTP required TRAI DLT registration or WhatsApp Business approval before a single login could be tested — both gate on external approval queues measured in days to weeks. Email + Google need no such approval. Phone is kept as an optional profile field for support/reminders. |
| Payments | **PhonePe API (server-side integration only)** | User explicitly has PhonePe access. Requires a registered PhonePe merchant/business account before going live — flag this to the user if not yet done. |
| Chatbot LLM | **Groq API (Llama 3.3 70B or Qwen)**, OpenAI-compatible schema | Free tier ~14,400 req/day, fastest response time of free options — good fit for FAQ/motivation bot UX. Wire it through an OpenAI-compatible client so it's swappable to OpenRouter/another provider later with a config change, not a rewrite. |
| Live classes | **LiveKit (self-hosted or LiveKit Cloud free tier)** | Full control, in-app branded experience, gated properly behind subscription status (unlike YouTube Live links) |
| Hosting (frontend) | **Vercel** (Next.js native) | Zero-config deploys, free tier sufficient for MVP |
| Hosting (LiveKit) | **LiveKit Cloud free tier initially** | Avoids self-hosting a media server on day one; migrate to self-hosted only if usage costs justify it |

**Do not swap any of the above without explicit user confirmation.** If a phase seems to require a different tool, stop and flag it rather than substituting silently.

---

## 0.1 Locked cross-cutting requirement: Mobile / responsive

**This is not a phase — it is a constraint that applies to every phase from Phase 0 onward.** No screen, component, or section is considered "done" until it's verified at mobile width. Do not build desktop-first and defer mobile to a later pass.

- **Breakpoints (Tailwind defaults, used consistently):**
  - `sm` 640px — large phones
  - `md` 768px — tablets
  - `lg` 1024px — small laptops
  - `xl` 1280px+ — desktop
  - Design and build mobile-first: base styles = phone, then layer up with `md:` / `lg:` overrides — not the reverse.
- **Every component/page built in Phase 1+ must be checked at minimum: 375px (small phone), 768px (tablet), 1280px (desktop)** before it's marked complete.
- **3D hero (R3F):** must degrade gracefully on mobile — lower particle/poly count or swap to a lighter/static variant below `md`, since phone GPUs and mobile data plans can't carry the same shader load as desktop. Respect `prefers-reduced-motion` on all breakpoints, but treat mobile perf as its own concern, not just an accessibility one.
- **Nav:** collapses to a hamburger/drawer below `md` — don't just shrink the desktop nav bar.
- **Touch targets:** minimum 44x44px tappable area on all interactive elements (buttons, nav links, plan-selector cards) — this is also an SEO/Core Web Vitals factor (mobile usability signals), not just UX polish.
- **Live classes (LiveKit) UI:** the viewer layout (Section 3.6) must work one-handed on a phone during an actual workout — controls large and reachable, not a shrunk desktop video-call layout.
- **Forms (OTP entry, profile capture, payment):** mobile keyboard types set correctly (`inputmode="numeric"` for OTP/phone, etc.), no layout shift when the mobile keyboard opens.
- **Testing:** use actual device emulation in browser devtools at minimum; real-device testing (or BrowserStack-equivalent) before Phase 3+ ships, since payment and live-class flows are the highest-stakes to get wrong on a real phone.
- **Definition of done, updated:** every phase's checklist (see Section 3.9 for LiveKit's example) implicitly includes "verified at mobile width" — this doesn't need to be repeated per phase, it's locked here globally.

---

## 0.2 Locked phase: SEO foundation (Phase 0.5)

**Runs after Phase 0 project setup, before Phase 1 landing page UI work begins.** SEO structure is far more expensive to retrofit than to build in from the start — metadata, routing conventions, and crawlability decisions need to exist before pages are written, not bolted on after.

### Technical SEO (Next.js App Router specifics)
- Use the **Metadata API** (`generateMetadata()`) per route — unique `title` + `description` for every page (landing, pricing, about, and any future blog/FAQ pages). No shared/generic metadata across routes.
- **`app/sitemap.ts`** and **`app/robots.ts`** file-convention routes — auto-generate the sitemap from actual routes rather than hand-maintaining a static XML file.
- **Disallow/`noindex` everything behind auth or otherwise non-marketing:** `/dashboard`, `/live/*`, `/api/*`, `/admin/*` must be excluded in `robots.ts` and carry `noindex` metadata. Only marketing pages (landing, pricing, about, contact, blog) should be crawlable — this must be decided now so it isn't accidentally left open later.
- **Dynamic OG images** via `opengraph-image.tsx` (`ImageResponse`) instead of one static banner — test actual rendering via Facebook/LinkedIn's official debugger tools before launch, not just by eyeballing the meta tags.
- **Canonical URLs** set explicitly on every page, especially once UTM/query-param links exist for marketing campaigns.
- **Structured data (JSON-LD):** `Organization`, `Product`/`Service` for the subscription plans, `FAQPage` if an FAQ section is added, and consider `LocalBusiness` if there's an India-local search angle.
- **`next/image`** everywhere (auto width/height, lazy-loading, AVIF/WebP) and **`next/font`** (self-hosted, no render-blocking Google Fonts request) — both are Core Web Vitals levers, not just convenience.

### Performance (Core Web Vitals — direct ranking factor)
- **LCP target < 2.5s.** Biggest risk is the R3F 3D hero: load it via `dynamic(() => import(...), { ssr: false })` so it never blocks first paint, and show a lightweight poster/placeholder image until the canvas mounts.
- **CLS:** reserve a fixed-aspect-ratio container for the hero/canvas before it mounts — no layout jump when WebGL initializes.
- **INP:** keep Framer Motion animations off the main thread where feasible; avoid heavy JS work on first user interaction.
- If any 3D assets beyond the shader-only hero get added later (flagging pre-emptively, given PixeVoid OG history), use compressed formats (e.g. Draco for GLTF) — not urgent now, but don't let scope creep in uncompressed.

### On-page / content SEO
- **Keyword strategy** — decide primary target keywords before writing landing copy (e.g. "online fitness classes India," "live workout classes app," "home fitness subscription"). Structure H1/H2s around them without stuffing.
- **Real crawlable text content** on the landing page — a features/benefits section with actual paragraphs. The 3D hero has zero SEO value on its own; text is still what gets indexed and ranked.
- **Blog/content section** — high-leverage for organic fitness traffic (workout guides, nutrition content) but this is a scope decision to confirm with the user, not an assumed requirement.
- **Internal linking** structure planned once pricing/about/blog pages exist.

### Off-page / discovery setup
- Google Search Console + Bing Webmaster Tools, with the sitemap submitted after Phase 1 ships.
- Google Business Profile if a local-service angle applies.
- Verify social share cards render correctly in the actual platform debugger tools, not just by inspecting meta tags locally.

### Open flag
- Add to Section 4's open-flags list: **primary target keywords** need user input before landing page copy is finalized (see Phase 1).

---

## 1. Data model (Supabase / Postgres) — ✅ implemented

**Authoritative source: `supabase/migrations/0001_init.sql` + `0002_email_auth.sql`.** The TypeScript mirror lives in `src/lib/db-types.ts` and must be updated in the same commit as any migration.

The shape below is what was built. It differs from the original sketch in four deliberate places, each noted — plus one later reversal (`0002`): `phone` was originally the unique auth key, `email` is now, per Section 0.3.

```sql
profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  phone         text,                    -- CHANGED (0002): optional contact field, no longer unique or the auth key
  email         text unique,             -- CHANGED (0002): now the auth key (partial unique index, null excluded)
  fitness_goal  text,
  role          text default 'member',   -- ADDED: 'member' | 'trainer' | 'admin'
  onboarded_at  timestamptz,             -- ADDED: null => send user to /onboarding
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
)

subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references profiles(id) on delete cascade,
  plan_tier               text,     -- CHANGED: 'group' | 'one_to_one' | 'squad'
  plan_duration           text,     -- CHANGED: 'monthly' | 'quarterly' | 'annual'
  amount_paise            integer,  -- ADDED: charged amount, in minor units
  status                  text,     -- 'pending' | 'active' | 'expired' | 'cancelled'
  phonepe_txn_id          text,
  phonepe_merchant_txn_id text unique,  -- ADDED: idempotency key for the callback
  start_date              timestamptz,
  end_date                timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
)

classes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  trainer_name     text,
  trainer_id       uuid references profiles(id),  -- ADDED
  scheduled_at     timestamptz not null,
  duration_minutes integer default 45,            -- ADDED
  livekit_room     text not null unique,
  is_premium       boolean default true,
  status           text default 'scheduled',      -- ADDED
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
)

chat_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade,
  message     text not null,
  response    text,
  created_at  timestamptz default now()
)
```

**Why each change:**

1. **`plan_type` → `plan_tier` + `plan_duration`.** The original schema had monthly/quarterly/annual, but the landing page sells Group / One-to-one / Squad. Both are real: the tiers are *what you buy*, the durations are *how long you buy it for*. Splitting them means adding a duration never requires a migration. Confirmed with the user 2026-07-25.
2. **`amount_paise` on the subscription row.** Price is stored per subscription, not looked up from the current catalogue, so raising prices later never rewrites what an existing member was charged. Integer paise, because rupee floats accumulate rounding errors the moment a discount is applied.
3. **`profiles.role`.** Section 3.5 needs to decide publish rights, and Phase 6 needs a server-checkable admin flag. One column answers both. It is *not* user-writable — the update policy pins it, or a member could promote themselves and mint publish-capable LiveKit tokens.
4. **`classes.trainer_id`.** Section 3.5 says "if the user is the trainer for this class" — a free-text `trainer_name` cannot be compared against `auth.uid()`. `trainer_name` stays as the display string.

**RLS — enabled on all four tables.** The pattern worth knowing before touching it: the service-role key bypasses RLS entirely, so anything the app writes on a user's behalf (subscription activation, chat logs) deliberately has **no client-facing write policy**. That is the security model, not an oversight — a user cannot mark their own subscription active because there is no policy that would let them.

- `profiles` — read/update own; `role` frozen against self-promotion.
- `subscriptions` — **read-only to the owner.** All writes go through the payment callback with the service role.
- `classes` — publicly readable (so the marketing schedule renders without a session), admin-only writes.
- `chat_logs` — read own; inserts are service-role only.
- `public.is_admin()` is `SECURITY DEFINER` with a pinned `search_path`. Required: a policy on `profiles` that reads `profiles` recurses forever otherwise.

---

## 2. Phase-by-phase plan

### Phase 0 — Project setup & design system — ✅ done
- Scaffold Next.js + TypeScript + Tailwind project.
- Set up Supabase project; create tables above with RLS policies. *(Migration written; running it against a real project is on the user.)*
- **Before writing any UI code:** consult the `frontend-design` skill (`/mnt/skills/public/frontend-design/SKILL.md`) and produce a design token plan (palette, type pairing, layout concept, one signature element) grounded in "fitness from home" — not a generic AI-template look. Design tokens must be defined mobile-first (see Section 0.1) — don't design at desktop width only and shrink later. Get user sign-off on the token plan before building screens.
- Env vars needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

### Phase 0.5 — SEO foundation — ✅ done
See **Section 0.2** for the full checklist (metadata API, sitemap/robots, OG images, Core Web Vitals, keyword strategy). Runs after Phase 0, before any Phase 1 UI is built.

Two follow-ups from the backend work:
- `/login` and `/onboarding` were added to the `robots.ts` disallow list, and every behind-auth route now also carries `robots: { index: false }` in its metadata. A disallowed URL can still be indexed if something links to it, so both are needed.
- The build output confirms the marketing routes are still statically prerendered — only `/dashboard`, `/login`, `/onboarding`, `/live/*` and the API routes are dynamic. Adding auth did not cost the landing page its static render.
- **Open:** `sitemap.ts` lists `/pricing` and `/contact`, which are anchors on the landing page rather than real routes. Either build those pages or drop them from the sitemap — submitting URLs that 404 is a crawl-budget own goal.

### Phase 1 — Landing page — ✅ done
- Marketing page: 3D hero (R3F), tagline "Fitness From Home," features section, pricing teaser, CTA → login/signup.
- Fully responsive per **Section 0.1** (mobile-first, verified at 375px/768px/1280px); respect `prefers-reduced-motion`; 3D hero must have a lighter mobile variant.
- Metadata, OG image, and structured data for this route set per **Section 0.2** before considering it done.
- No backend calls needed here beyond CTA routing.

### Phase 2 — Auth + data capture — ✅ code complete
- Supabase **email-OTP + Google OAuth** signup/login flow (reversed from phone-OTP 2026-07-25 — see Section 0.3 for why).
- On first login, collect name (+ optional fitness goal + optional phone) → write to `profiles`.
- This table is what customer support will query — keep it simple and queryable.

**What was built**

| File | Role |
|---|---|
| `src/lib/supabase/{client,server,admin}.ts` | Browser / request-scoped server / service-role clients. `admin.ts` imports `server-only`, so leaking it into a client bundle is a build error rather than a leaked key. |
| `src/proxy.ts` | Refreshes the Supabase session on every navigation, plus an **optimistic** redirect for signed-out users. Not the access control — see below. |
| `src/lib/auth/dal.ts` | The Data Access Layer. `requireUser`, `requireOnboardedProfile`, `getActiveSubscription`, `isAdmin`. Every one is wrapped in React `cache()`, so a page that asks three times pays for one query. |
| `src/app/actions/auth.ts` | Server Actions: `sendOtp`, `verifyOtp` (email), `signInWithGoogle`, `completeOnboarding`, `signOut`. |
| `src/app/auth/callback/route.ts` | Route Handler — Google's redirect lands here with a `code` param; exchanges it for a session via `exchangeCodeForSession`, then routes to onboarding or `next` depending on profile state. Not a Server Action because it's a cross-site GET from Google, not a form post from our own page. |
| `src/app/login/`, `src/app/onboarding/`, `src/app/dashboard/` | The screens. |
| `src/lib/phone.ts` | E.164 normalisation, still used — phone is now an optional profile field (onboarding + admin display), not the auth key. |

**Four decisions worth not re-litigating:**

- **Server Actions, not API routes, for the email-OTP form.** The code never passes through client-side code we control, and Supabase's cookie writes land on a response that is still open.
- **Google OAuth is a Server Action + Route Handler pair, not client-side `supabase-js`.** `signInWithGoogle` (Server Action) starts the handshake and redirects to Google; `/auth/callback` (Route Handler) finishes it. Keeping the whole flow server-side means the session cookie is set the same way as the email-OTP path, and there's exactly one place (`dal.ts`) that ever reads "who is this."
- **The proxy is not the security boundary.** It runs on prefetches and cannot do database work cheaply, so it only decides "signed out → /login". Real gating is the DAL, each route handler, and RLS — three layers, each next to the data.
- **`getUser()`, never `getSession()`.** `getSession()` trusts a cookie the client could have forged; `getUser()` revalidates against the auth server.

**Still to do:**
- Create the Google OAuth client and paste its ID/secret into Supabase (Section 0.3) — the code is ready, the account isn't.
- Nothing has been tested against a live Supabase project yet.
- Consider enabling Supabase's "linked accounts" setting so a user who signs up by email and later uses Google with the same address doesn't get two separate accounts (Section 0.3, step 5).

### Phase 3 — Subscriptions + PhonePe payment — ⬜ not started
- Plan tiers are **tier × duration** — see Section 1. The catalogue (tier/duration metadata, amortisation math) lives at `src/lib/plans.ts`; the actual numbers are admin-editable and fetched from Supabase at `src/lib/pricing.ts`.
- **Squad retired 2026-07-29** — only Group and One-to-one are sold now. Monthly prices are ₹2,500 (Group) and ₹5,000 (One-to-one), editable from `/admin/pricing` without a deploy (`plan_prices` table). Quarterly (10% off) and annual (20% off) are derived and **confirmed** (`plan_duration_discounts` table) — `assertChargeable()` still exists as the Phase 3 guard but nothing is a placeholder anymore.
- `subscriptions.phonepe_merchant_txn_id` is unique: use it as the idempotency key so a replayed callback cannot double-activate a membership.
- The activation write must use the **service-role** client — there is deliberately no client-side write policy on `subscriptions`.
- Build `/api/payments/initiate` (Next.js API route) that calls PhonePe's payment-initiation endpoint server-side. **Never expose PhonePe merchant keys client-side.**
- Build `/api/payments/callback` to handle PhonePe's webhook/redirect, verify signature, and update `subscriptions.status` to `active`.
- Gate premium routes (live classes) behind an `active` subscription check (server-side, not just UI hiding).
- **Blocker to flag:** PhonePe requires a registered merchant account (GST/business PAN etc.) before going live. Confirm this is set up before starting this phase for real; sandbox/test mode can proceed without it.

### Phase 4 — Live classes (LiveKit) — 🟡 backend done
See **Section 3 below** for the full implementation plan, now annotated with what exists.

Built: `src/app/api/live/token/route.ts` (the paywall), `src/lib/classes.ts` (schedule queries), `src/components/live/LiveRoom.tsx` + `src/app/live/[classId]/page.tsx` (a minimal one-to-many viewer).

Not built: class scheduling UI — that is Phase 6. Until then, insert rows by hand (`supabase/seed.sql` shows how).

### Phase 5 — Chatbot (Groq) — 🟡 backend done
- Server-side API route `/api/chat` — never call Groq directly from the client (API key must stay server-side).
- Use OpenAI-compatible request format pointed at Groq's endpoint so switching providers later is a base-URL change, not a rewrite.
- Scope the system prompt tightly: general fitness Q&A, motivation, workout suggestions — explicitly **not** medical advice. Include a disclaimer in the system prompt and/or UI.
- Optionally log exchanges to `chat_logs` for support visibility (confirm with user — this has privacy implications, mention it if enabled).

**What was built** — `src/app/api/chat/route.ts` and `src/lib/chat/prompt.ts`:

- Streams `text/plain` token deltas. The provider's SSE is parsed server-side rather than forwarded, so the client is a `for await` over text and the wire format stays ours if the provider's changes.
- Provider is fully swappable via `CHAT_API_BASE_URL` + `CHAT_MODEL`. Groq's error bodies are logged, never forwarded — they can quote our request back.
- **Auth required**, plus a rate limit of 20 messages / 5 min per user. Only the last 12 messages are forwarded and the system prompt is always prepended server-side, so a client cannot replay a huge history to run up the bill or swap in its own instructions.
- The system prompt refuses medical questions by name (pain, injury, pregnancy, medication, supplements, restrictive diets) and points to a professional. `CHAT_DISCLAIMER` is exported alongside it so the UI copy and the model constraint can't drift apart.
- `chat_logs` writing is behind `CHAT_LOG_ENABLED`, **off by default** — open flag 3 below.

**Remaining:** the chat UI widget. The route has no consumer yet.

**Known limit:** the rate limiter is in-process memory (`src/lib/rate-limit.ts`). On Vercel each lambda has its own map, so the real ceiling is roughly 20 × concurrent instances, and it resets on cold start. Fine against a signed-in member; inadequate if the bot is ever opened to anonymous users — move it to Upstash Redis at that point.

### Phase 5.5 — Self-assessment (anonymous lead capture) — ✅ code complete
Not in the original plan — added on request. **Replaced 2026-07-29**: the "Get your fitness score" button on the landing hero opens `/assessment`, now a fixed 15-question scored quiz (not a Groq chat) — a numeric 0-100 score, a result band, a plan-tier recommendation, and a PDF report emailed to the visitor, with a WhatsApp follow-up link. No account needed.

**What was built:**
- `src/lib/assessment/` — `types.ts` (answer shape), `scoring.ts` (pure 4-category scoring: BMI/activity/physical/lifestyle, 25 pts each, rescaled to 100 if the optional physical section is skipped), `labels.ts` (answer copy shared by the UI, PDF and emails), `pdf.tsx` (`@react-pdf/renderer` report), `emailTemplate.ts`, `whatsapp.ts` (prefilled `wa.me` link — see below).
- `src/components/assessment/AssessmentQuiz.tsx` — multi-step client quiz (5 sections + contact step), replaces the retired `AssessmentChat.tsx`.
- `src/app/api/assessment/route.ts` — rewritten: validates answers with zod, **re-scores server-side** (never trusts a client-sent score), writes the lead, renders the PDF, emails it via Resend if an email was given, and returns a `wa.me` link plus the PDF as base64 for an in-browser download. Rate-limited by IP (5/10 min) + honeypot, replacing the old chat route and the now-deleted `/api/leads/route.ts`.
- `supabase/migrations/0005_assessment_scoring.sql` — adds `score`, `band`, `tier_nudge`, `answers` columns to `leads` (all nullable, so pre-existing rows from the old chat flow are unaffected).
- `/admin/leads` — now shows the score/band next to each lead.
- **WhatsApp is not yet automated.** Full delivery needs the WhatsApp Business Cloud API (Meta business verification + an approved message template) — deferred; the result screen instead opens a prefilled `wa.me/916207524549` link (same number as the footer/contact section) so the visitor's own tap starts the conversation. Automating it later is a change inside `whatsapp.ts` only.
- **Email needs `RESEND_API_KEY`** (see `.env.example`) to actually send — without it, `sendEmail()` throws, which the route catches and logs; the visitor still gets the score, the WhatsApp link and the PDF download, just no email.
- `.btn-ai` in `globals.css` (the CTA's rotating-gradient border) is kept as-is — cosmetic, unrelated to the AI-chat removal.

**Known limit:** same in-process rate limiter as Phase 5, now actually exposed to anonymous traffic rather than just members — move to Upstash Redis if abuse shows up.

### Phase 6 — Admin / support dashboard — ✅ code complete
- Protected route (admin role check) listing: signups (`profiles`), subscription status (`subscriptions`), and a way to see/manage `classes`.
- This is the tool customer support actually uses day-to-day — keep it functional over pretty.

**What was built**

| Route | Does |
|---|---|
| `/admin` | Counts (signups, active memberships, upcoming classes) + latest signups. |
| `/admin/members` | Every member with their current plan. Set role (member/trainer/admin); grant a membership recording what was actually collected; cancel one. |
| `/admin/classes` | Schedule a class (title, time, duration, trainer, members-only) and move it through scheduled → live → ended, or cancel it. |

**Decisions worth knowing:**

- **Reads use the *user's* client, not the service role.** The admin's own RLS still applies — `is_admin()` is what widens `profiles` and `subscriptions` to every row. A bug that let a non-admin reach that code returns an empty list rather than the whole member table. The service role is used only for writes RLS has no policy for: role changes (pinned) and subscriptions (read-only to users).
- **`requireAdmin()` is called by every page *and* every action.** A Server Action is a public endpoint; "only admins see the button" protects nothing.
- **Non-admins get `notFound()`, not a 403.** An admin area that announces its own existence to every logged-in member is an invitation to go looking.
- **Granting a membership inserts, never edits.** History of what was given and when survives; `getActiveSubscription()` reads the latest-ending row, so a new grant supersedes an old one without deleting it.
- **The amount field is editable and defaults to the catalogue price.** Until PhonePe lands, money arrives over UPI or in cash for whatever was agreed — the record should say what was actually collected, not what the price list says. Set 0 for a comp.

**Verified against a real Postgres** with a stand-in for Supabase's `auth` schema: an admin sees all profiles and can create/update classes through RLS; a trainer sees only their own profile and is refused both; the grant → member-sees-it → cancel → member-loses-it cycle works; an invalid `plan_tier` is refused by the check constraint.

**Remaining:** the first admin promotion is still raw SQL, unavoidably — the thing that grants admin *is* the admin panel. One `update` statement, once. See Section 0.3.

### Phase 7 — Prep for mobile app
- Once web is stable, the Supabase backend (auth, DB schema, payment logic, LiveKit rooms) is reused as-is for a Flutter app. Only the UI layer gets rebuilt in Flutter.

---

## 3. LiveKit implementation plan (detailed — Phase 4)

This section is written so a Claude instance with zero prior context on this project can implement live classes correctly.

### 3.1 Why LiveKit (context for whoever implements this)
LiveKit is an open-source WebRTC platform (self-hostable, or use LiveKit Cloud's free tier to start). Unlike an embedded YouTube Live link, it lets the app **enforce the subscription paywall at the room-access level** — a user without an active subscription is never issued a valid room token, so they can't join no matter what link they have. It also keeps the whole experience inside Mass Fitness's own branded UI instead of leaking to a third-party player.

### 3.2 Accounts & setup (one-time, human does this)
1. Sign up at `livekit.io` → create a project on **LiveKit Cloud free tier** (sufficient for MVP traffic; avoids running your own media server on day one).
2. From the project dashboard, get: `LIVEKIT_URL` (wss://...), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
3. Store these as server-only env vars — **never expose `LIVEKIT_API_SECRET` to the client.**

### 3.3 Packages
```bash
npm install livekit-server-sdk        # server-side: create rooms, mint access tokens
npm install @livekit/components-react livekit-client   # client-side: video/audio UI components
```

### 3.4 Architecture
```
Trainer/Admin                     Backend (Next.js API routes)              Student (client)
     |                                      |                                     |
  schedules class ---------------------> writes to `classes` table               |
     |                                      |                                     |
  starts session ---------------------> POST /api/live/token (role=trainer)       |
     |                                      | mints LiveKit access token           |
     |<--- token ---------------------------|                                     |
  joins LiveKit room as publisher                                                 |
                                             |                                     |
                                       (student clicks "Join class")               |
                                             |<--- POST /api/live/token -----------|
                                             |   (role=viewer)                     |
                                        1. check auth session                     |
                                        2. check subscriptions.status = 'active'  |
                                        3. if valid: mint viewer token             |
                                        4. if not: 403, redirect to /subscribe     |
                                             |--- token ---------------------------|
                                                                          joins room as viewer
```

### 3.5 Server-side: room + token creation — ✅ implemented as specified
`src/app/api/live/token/route.ts`. Original spec below; three implementation notes first.

- **Hosts skip the paywall.** A trainer whose own membership lapsed should not be locked out of the class they are running. Host = the class's `trainer_id`, or anyone with `role = 'admin'`.
- **Token TTL is 3 hours, not 1.** LiveKit does not evict a participant when a token expires, but a mid-class reconnect on a dropped mobile network re-presents the same token — a short TTL turns a lost signal into an unrecoverable session. Access is re-checked on every mint, so a long TTL never extends a lapsed membership past the next join.
- **Viewers get `canPublish: false` explicitly.** Per the SDK, omitting both `canPublish` and `canSubscribe` grants *both* — the safe-looking omission is the dangerous one.

Original spec:
- Auth-check the request (Supabase session).
- Look up the class by ID from `classes` table.
- **Critical gate:** query `subscriptions` for this user; if no row with `status = 'active'` and `end_date > now()`, return 403. Do this check server-side always — never trust a client-side "isSubscribed" flag.
- If the user is the trainer/admin for this class, mint a token with publish permissions (`canPublish: true`).
- Otherwise mint a token with subscribe-only permissions (`canPublish: false, canSubscribe: true`).
- Use `livekit-server-sdk`'s `AccessToken` class, set `identity` to the Supabase user id, set room name to `classes.livekit_room`.
- Token expiry: short-lived (e.g. 1 hour) since it's minted fresh per join.

### 3.6 Client-side: joining a room — ✅ implemented (`src/components/live/LiveRoom.tsx`)
Built as the custom minimal layout rather than `<VideoConference />`: video fills the screen, controls sit in a bottom bar within thumb reach, and there is no viewer grid to hide — `useTracks` can only surface tracks that were published, and only the host can publish.

Original spec:
- Use `@livekit/components-react`'s `<LiveKitRoom>` component, passing the `LIVEKIT_URL` and the token fetched from `/api/live/token`.
- For viewers: render `<VideoConference />` or a custom minimal layout showing only the trainer's video/audio (hide other viewers' tiles — most fitness class UIs are one-to-many, not a grid call).
- For trainer: same component but with local camera/mic publish controls.
- Handle the "class hasn't started yet" and "class ended" states gracefully — check `classes.scheduled_at` client-side for UI messaging, but rely on the server-side token gate for actual access control.

### 3.7 Scheduling flow
- Admin dashboard (Phase 6) or a simpler admin-only form creates a row in `classes` with `title`, `trainer_name`, `scheduled_at`, and a generated `livekit_room` name (e.g. `class-{uuid}`). No need to pre-create the room on LiveKit's side — LiveKit rooms are created implicitly when the first participant joins with a token for that room name.
- Students see upcoming classes queried from `classes` where `scheduled_at > now()`, ordered ascending.

### 3.8 What NOT to build in v1 (explicit scope cut)
- Do not build recording/playback storage yet — LiveKit supports egress/recording, but treat it as a future phase once there's demand.
- Do not build multi-camera layouts or breakout rooms — one trainer publishing, many viewers, is the correct v1 shape for a fitness class.
- Do not self-host the LiveKit media server yet — use LiveKit Cloud's free tier until usage numbers justify the operational overhead of self-hosting.

### 3.9 Testing checklist before calling this phase done

"Handled in code" means the logic exists and typechecks. **Nothing here has been run against a live LiveKit project** — every box still needs a human to tick it.

- [ ] A user with no subscription gets a 403 when requesting a token for a premium class. *(Handled in code — `subscription_required`.)*
- [ ] A user with an expired subscription (`end_date` in the past) also gets a 403, not just `status != 'active'` — check both. *(Handled in code — `getActiveSubscription()` filters on `status = 'active'` **and** `end_date > now()`. A null `end_date` is treated as not-yet-valid rather than never-expiring: a subscription with no term is a half-written payment record, not a lifetime membership.)*
- [ ] Trainer can publish video/audio; viewers receive it but cannot publish. *(Handled in code — `canPublish: isHost`.)*
- [ ] Token expiry doesn't break an in-progress session. *(Handled in code — 3h TTL, see 3.5.)*
- [ ] Room names are unique per class and don't collide across scheduled sessions. *(Handled in schema — `classes.livekit_room` is `unique not null`, so a collision is a constraint violation at insert rather than two classes sharing a room at 7am.)*
- [ ] Viewer layout verified one-handed on an actual phone (or emulated at 375px width) per **Section 0.1** — controls reachable, no desktop-video-call layout shrunk down. **Not verified — needs a real device.**
- [ ] Viewer joins with no camera/mic permission prompt at all. *(Handled in code — `video`/`audio` are false for viewers; worth confirming on a real phone, since a permission dialog on a bedroom workout is a trust problem.)*

---

## 4. Open flags for the user (not blockers to starting, but need answers before the relevant phase)

**Still open:**

1. **PhonePe merchant account status** — needed before Phase 3 goes beyond sandbox.
4. **WhatsApp Business Cloud API** — Phase 5.5 result delivery uses a prefilled `wa.me` link today. Automating it needs Meta business verification and an approved message template; no lead time estimate until that process is started.

**Resolved since:**

2. ~~Chat logging to `chat_logs`~~ — resolved 2026-08-03, switched **on** and no longer a flag. The assistant's rate limits are counted from those rows, so a switch that disabled logging would silently disable abuse protection. Retention is 12 months (`prune_chat_logs()`), the privacy policy has a section on it, and the widget says so above the first message. Consent covers using the conversations to improve the assistant — including future model training — which is why it is stated in both places rather than only the policy.
3. ~~Blog/content section~~ — resolved 2026-08-03, in scope and built. Stored in Postgres rather than MDX in the repo, because a file-based blog needs a deploy per post and the author will not always be a developer. Standalone SEO landing pages were considered and deliberately deferred.

**Resolved:**

4. ~~Design token sign-off~~ — done, Phase 1 shipped on it.
5. ~~Primary target SEO keywords~~ — set in `layout.tsx` metadata ("online fitness classes", "live workout classes app", "home fitness subscription", "fitness from home", "live online fitness classes India").

**New flags raised by the backend work:**

7. ~~OTP delivery channel for launch~~ — resolved 2026-07-25, differently than originally framed. Phone OTP (WhatsApp/SMS) is dropped in favour of **email OTP + Google OAuth**, which need no DLT registration or WhatsApp Business approval. See **Section 0.3**. Phone-based OTP is still available to add back later if there's a product reason (Section 0.3, final subsection).
8. ~~Who is a trainer?~~ — resolved. `/admin/members` sets roles and `/admin/classes` assigns trainers. Only the first admin promotion still needs SQL.
9. ~~Subscription expiry sweep~~ — resolved 2026-08-03. `public.expire_subscriptions()` in `0006_maintenance.sql`, scheduled hourly via pg_cron where the extension is available and runnable by hand where it is not.
10. **Account linking for email + Google.** If a user signs up with email first and later uses Google with the same address, Supabase creates two separate accounts unless "linked accounts" is enabled in the dashboard (Section 0.3, step 5). Worth confirming this is on before launch.
11. ~~Quarterly and annual pricing~~ — resolved 2026-07-29. Squad tier retired; Group and One-to-one monthly prices are confirmed (₹2,500 / ₹5,000) and admin-editable at `/admin/pricing`, and quarterly (10% off) / annual (20% off) are now real, confirmed prices rather than placeholders.

---

## 5. Suggested execution order
Phase 0 → **Phase 0.5 (SEO foundation)** → Phase 1 → Phase 2 → Phase 3 → Phase 4 (LiveKit) → Phase 5 (Groq chatbot) → Phase 6 (admin) → Phase 7 (app).
Phases 4 and 5 are independent of each other and could be reordered or parallelized if working with more than one dev/session.
**Mobile/responsive (Section 0.1) is not a phase in this sequence — it's a standing requirement checked at every phase's "done" gate, starting with Phase 0's design tokens.**

### Recommended next steps

The code is now ahead of the accounts in every direction. Nothing further is worth building until the app has been run against a real Supabase project once — and that no longer needs a paid provider, because email OTP + Google OAuth replace phone (Section 0.3).

1. **Stand up Supabase**, run both migrations (`0001_init.sql`, `0002_email_auth.sql`), set up the Google OAuth client, fill `.env.local` (including `NEXT_PUBLIC_SITE_URL`). Promote yourself to admin with the one SQL statement (by email now, not phone).
2. **Walk all three roles.** Log in as yourself → onboard → dashboard. Sign up a second account (a friend's email, or an incognito window + your own via a different method) and promote it to trainer in `/admin/members`. Schedule a class in `/admin/classes` assigned to that trainer. Confirm the customer sees "Members only", grant them a membership, confirm it unlocks, cancel it, confirm it re-locks. That sequence exercises the entire backend.
3. **Add LiveKit** and repeat step 2's last part with a real join: trainer publishes, customer receives, and a customer with no membership is refused a token.
4. **Then Phase 3 (payments)**, once the merchant account and quarterly/annual pricing land.
5. **The chat widget** whenever — `/api/chat` is waiting for a consumer, and it is self-contained UI work.
