# Mass Fitness — Master Build Plan

**Tagline:** "Fitness From Home"
**Owner:** Ankit (PixeVoid)
**Purpose of this doc:** This is the single source of truth for building Mass Fitness. Any Claude instance (or human dev) should be able to read this top to bottom and execute a phase without needing to re-derive decisions, ask "which stack should I use," or guess at scope. If something isn't in this doc, stop and ask the user rather than assuming.

---

## Status at a glance

Last updated: 2026-07-25. Update this table in the same commit as the work it describes.

| Phase | Status | Notes |
|---|---|---|
| 0 — Project setup & design system | ✅ Done | Next 16 + TS + Tailwind 4 scaffolded; schema + RLS written as a migration. Supabase project itself still needs creating by a human — see "What the user still has to do". |
| 0.5 — SEO foundation | ✅ Done | Metadata API, `sitemap.ts`, `robots.ts`, OG image, JSON-LD all in place. Behind-auth routes now carry `noindex` as well as a robots disallow. |
| 1 — Landing page | ✅ Done | 3D hero, features, pricing, contact. |
| 2 — Auth + data capture | ✅ Code complete | Phone-OTP login, profile capture, protected dashboard. Untested against a live Supabase project. |
| 3 — Subscriptions + PhonePe | ⬜ Not started | Schema and plan catalogue are ready for it. Blocked on merchant account + confirmed pricing. |
| 4 — Live classes (LiveKit) | 🟡 Backend done | Token route with the paywall gate, plus a minimal viewer. Needs a real LiveKit project to test. |
| 5 — Chatbot (Groq) | 🟡 Backend done | `/api/chat` streaming route. No chat UI widget yet — that is the remaining piece. |
| 6 — Admin dashboard | ⬜ Not started | `profiles.role = 'admin'` and the `is_admin()` RLS helper exist to build on. |
| 7 — Flutter app prep | ⬜ Not started | — |

### Framework note (matters before writing any code)

The project is on **Next.js 16**, which is not the Next.js most training data describes. Read the bundled docs in `node_modules/next/dist/docs/` before writing code — per `AGENTS.md`. The change that has already bitten this codebase:

- **Middleware is now Proxy.** The file is `src/proxy.ts` exporting `proxy()`, not `middleware.ts`. Same execution model, runs on the Node runtime.
- `cookies()`, `headers()`, `params` and `searchParams` are all async and must be awaited.

### What the user still has to do before any of this runs

None of it is code — all of it is account setup, and nothing below can be done from a dev session.

1. **Create the Supabase project**, then run `supabase/migrations/0001_init.sql` against it (SQL editor or `supabase db push`).
2. **Enable Phone auth** in Supabase → Authentication → Providers, and connect an SMS provider (Twilio/MSG91). Phone OTP does nothing until an SMS provider is wired up, and Indian DLT registration takes time — start it early.
3. **Create a LiveKit Cloud project** for the URL, key and secret.
4. **Get a Groq API key.**
5. Copy `.env.example` → `.env.local` and fill it in. Same values go into Vercel's env settings for deploys.

---

## 0. Locked decisions (do not re-litigate these)

| Area | Decision | Why |
|---|---|---|
| Frontend framework | **Next.js 14+ (App Router) + TypeScript** | Reusable API-route pattern, SSR for SEO on landing page, natural fit for later app work |
| Styling | **Tailwind CSS** | Fast, consistent, works well with design tokens |
| 3D / animation | **React Three Fiber (R3F) + drei + Framer Motion** | Needed for the Dribbble-tier 3D hero the user wants |
| Backend / DB | **Supabase (Postgres + Auth + Storage + Realtime)** | User already knows Supabase; single provider covers auth, DB, and later realtime needs |
| Auth | **Supabase Auth — Phone OTP** | User collects phone numbers anyway; avoids separate password-reset flow |
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

**Authoritative source: `supabase/migrations/0001_init.sql`.** The TypeScript mirror lives in `src/lib/db-types.ts` and must be updated in the same commit as any migration.

The shape below is what was built. It differs from the original sketch in four deliberate places, each noted.

```sql
profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text,
  phone         text unique,
  email         text,
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
- Supabase phone-OTP signup/login flow.
- On first login, collect name + phone (+ optional fitness goal) → write to `profiles`.
- This table is what customer support will query — keep it simple and queryable.

**What was built**

| File | Role |
|---|---|
| `src/lib/supabase/{client,server,admin}.ts` | Browser / request-scoped server / service-role clients. `admin.ts` imports `server-only`, so leaking it into a client bundle is a build error rather than a leaked key. |
| `src/proxy.ts` | Refreshes the Supabase session on every navigation, plus an **optimistic** redirect for signed-out users. Not the access control — see below. |
| `src/lib/auth/dal.ts` | The Data Access Layer. `requireUser`, `requireOnboardedProfile`, `getActiveSubscription`, `isAdmin`. Every one is wrapped in React `cache()`, so a page that asks three times pays for one query. |
| `src/app/actions/auth.ts` | Server Actions: `sendOtp`, `verifyOtp`, `completeOnboarding`, `signOut`. |
| `src/app/login/`, `src/app/onboarding/`, `src/app/dashboard/` | The screens. |
| `src/lib/phone.ts` | E.164 normalisation. Without it `9876543210` and `+919876543210` become two accounts for the same person. |

**Three decisions worth not re-litigating:**

- **Server Actions, not API routes, for auth.** The OTP never passes through client-side code we control, and Supabase's cookie writes land on a response that is still open.
- **The proxy is not the security boundary.** It runs on prefetches and cannot do database work cheaply, so it only decides "signed out → /login". Real gating is the DAL, each route handler, and RLS — three layers, each next to the data.
- **`getUser()`, never `getSession()`.** `getSession()` trusts a cookie the client could have forged; `getUser()` revalidates against the auth server.

**Still to do:** Supabase phone auth needs an SMS provider connected before any of this sends a message. Nothing has been tested against a live project.

### Phase 3 — Subscriptions + PhonePe payment — ⬜ not started
- Plan tiers are **tier × duration** — see Section 1. The catalogue is already built at `src/lib/plans.ts`.
- **Only the monthly prices are confirmed** (Group ₹1,499 / One-to-one ₹2,999 / Squad ₹1,199, taken from the landing page). Quarterly and annual are placeholders derived from a 10% / 20% discount and are flagged `priceConfirmed: false`. `assertChargeable()` throws if an unconfirmed plan reaches a payment call — so Phase 3 cannot quietly bill a made-up number. Delete the flag once real prices are signed off.
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

### Phase 6 — Admin / support dashboard — ⬜ not started
- Protected route (admin role check) listing: signups (`profiles`), subscription status (`subscriptions`), and a way to see/manage `classes`.
- This is the tool customer support actually uses day-to-day — keep it functional over pretty.

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
2. **Quarterly and annual pricing** — the three monthly prices are settled (the landing page's). The longer durations are placeholders at a 10%/20% discount and are code-flagged so they cannot be charged. Tier structure itself is now resolved: tier × duration, confirmed 2026-07-25.
3. **Chat logging to `chat_logs`** — built but **off by default** (`CHAT_LOG_ENABLED=false`). Switching it on means storing what members ask the bot, which for a fitness product includes things about their body and health. If it goes on, the privacy policy needs to say so and the chat UI should mention it.
6. **Whether a blog/content section is in scope** — affects Phase 0.5 SEO planning and Phase 1 routing.

**Resolved:**

4. ~~Design token sign-off~~ — done, Phase 1 shipped on it.
5. ~~Primary target SEO keywords~~ — set in `layout.tsx` metadata ("online fitness classes", "live workout classes app", "home fitness subscription", "fitness from home", "live online fitness classes India").

**New flags raised by the backend work:**

7. **SMS provider for phone OTP.** Supabase Auth needs Twilio/MSG91 connected before a single code sends, and Indian DLT template registration has a lead time. This gates all of Phase 2 actually working — worth starting before it becomes the blocker.
8. **Who is a trainer?** `profiles.role` and `classes.trainer_id` exist, but there is no UI to set either. Until Phase 6, promoting a trainer or admin is a manual SQL update (`supabase/seed.sql` shows the statement).
9. **Subscription expiry sweep.** Nothing currently moves a subscription from `active` to `expired` when its term ends. Access checks compare against `end_date` so an expired member is correctly locked out regardless — but the `status` column will drift from reality, which will mislead whoever reads the admin dashboard. A Supabase scheduled function (pg_cron) should flip them; worth doing in Phase 3 alongside the payment writes.

---

## 5. Suggested execution order
Phase 0 → **Phase 0.5 (SEO foundation)** → Phase 1 → Phase 2 → Phase 3 → Phase 4 (LiveKit) → Phase 5 (Groq chatbot) → Phase 6 (admin) → Phase 7 (app).
Phases 4 and 5 are independent of each other and could be reordered or parallelized if working with more than one dev/session.
**Mobile/responsive (Section 0.1) is not a phase in this sequence — it's a standing requirement checked at every phase's "done" gate, starting with Phase 0's design tokens.**

### Recommended next steps

The code is ahead of the accounts. The highest-value next move is not more code — it is standing up the Supabase project and SMS provider so Phase 2 can actually be tested end to end, because everything downstream (payments, live classes, chat) authenticates through it.

1. **Stand up the accounts** (Supabase + SMS provider, LiveKit, Groq), run the migration, fill `.env.local`. Then walk the flow: log in by OTP → land on `/onboarding` → `/dashboard`.
2. **Grant yourself a subscription by hand** (`supabase/seed.sql`) and confirm a seeded class unlocks — then revoke it and confirm the 403. That single test exercises the whole paywall.
3. **Phase 6 before Phase 3.** The admin dashboard is small, unblocked, and removes the hand-written SQL from steps 1–2. Phase 3 is blocked on the merchant account and the remaining prices anyway.
4. **Then Phase 3 (payments)**, once the merchant account and quarterly/annual pricing land.
5. **The chat widget** whenever — `/api/chat` is waiting for a consumer, and it is a self-contained piece of UI work.
