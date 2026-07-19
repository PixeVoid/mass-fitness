# Mass Fitness — Master Build Plan

**Tagline:** "Fitness From Home"
**Owner:** Ankit (PixeVoid)
**Purpose of this doc:** This is the single source of truth for building Mass Fitness. Any Claude instance (or human dev) should be able to read this top to bottom and execute a phase without needing to re-derive decisions, ask "which stack should I use," or guess at scope. If something isn't in this doc, stop and ask the user rather than assuming.

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

## 1. Data model (Supabase / Postgres)

```sql
-- profiles: one row per authenticated user
profiles (
  id            uuid primary key references auth.users(id),
  name          text,
  phone         text unique,
  email         text,
  fitness_goal  text,
  created_at    timestamptz default now()
)

-- subscriptions: plan + payment state
subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id),
  plan_type       text,        -- 'monthly' | 'quarterly' | 'annual'
  status          text,        -- 'pending' | 'active' | 'expired' | 'cancelled'
  phonepe_txn_id  text,
  start_date      timestamptz,
  end_date        timestamptz,
  created_at      timestamptz default now()
)

-- classes: scheduled live sessions
classes (
  id              uuid primary key default gen_random_uuid(),
  title           text,
  trainer_name    text,
  scheduled_at    timestamptz,
  livekit_room    text,        -- room name/id created via LiveKit API
  is_premium      boolean default true,
  created_at      timestamptz default now()
)

-- chat_logs: optional, lets support staff see chatbot history
chat_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  message     text,
  response    text,
  created_at  timestamptz default now()
)
```

Row-Level Security (RLS) must be enabled on all tables. Users can read/write only their own `profiles`/`subscriptions`/`chat_logs` rows; `classes` is publicly readable but only writable by an admin role.

---

## 2. Phase-by-phase plan

### Phase 0 — Project setup & design system
- Scaffold Next.js + TypeScript + Tailwind project.
- Set up Supabase project; create tables above with RLS policies.
- **Before writing any UI code:** consult the `frontend-design` skill (`/mnt/skills/public/frontend-design/SKILL.md`) and produce a design token plan (palette, type pairing, layout concept, one signature element) grounded in "fitness from home" — not a generic AI-template look. Design tokens must be defined mobile-first (see Section 0.1) — don't design at desktop width only and shrink later. Get user sign-off on the token plan before building screens.
- Env vars needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

### Phase 0.5 — SEO foundation
See **Section 0.2** for the full checklist (metadata API, sitemap/robots, OG images, Core Web Vitals, keyword strategy). Runs after Phase 0, before any Phase 1 UI is built.

### Phase 1 — Landing page
- Marketing page: 3D hero (R3F), tagline "Fitness From Home," features section, pricing teaser, CTA → login/signup.
- Fully responsive per **Section 0.1** (mobile-first, verified at 375px/768px/1280px); respect `prefers-reduced-motion`; 3D hero must have a lighter mobile variant.
- Metadata, OG image, and structured data for this route set per **Section 0.2** before considering it done.
- No backend calls needed here beyond CTA routing.

### Phase 2 — Auth + data capture
- Supabase phone-OTP signup/login flow.
- On first login, collect name + phone (+ optional fitness goal) → write to `profiles`.
- This table is what customer support will query — keep it simple and queryable.

### Phase 3 — Subscriptions + PhonePe payment
- Define plan tiers (monthly/quarterly/annual — confirm pricing with user before hardcoding).
- Build `/api/payments/initiate` (Next.js API route) that calls PhonePe's payment-initiation endpoint server-side. **Never expose PhonePe merchant keys client-side.**
- Build `/api/payments/callback` to handle PhonePe's webhook/redirect, verify signature, and update `subscriptions.status` to `active`.
- Gate premium routes (live classes) behind an `active` subscription check (server-side, not just UI hiding).
- **Blocker to flag:** PhonePe requires a registered merchant account (GST/business PAN etc.) before going live. Confirm this is set up before starting this phase for real; sandbox/test mode can proceed without it.

### Phase 4 — Live classes (LiveKit)
This is the newly-detailed phase — see **Section 3 below** for the full LiveKit implementation plan.

### Phase 5 — Chatbot (Groq)
- Server-side API route `/api/chat` — never call Groq directly from the client (API key must stay server-side).
- Use OpenAI-compatible request format pointed at Groq's endpoint so switching providers later is a base-URL change, not a rewrite.
- Scope the system prompt tightly: general fitness Q&A, motivation, workout suggestions — explicitly **not** medical advice. Include a disclaimer in the system prompt and/or UI.
- Optionally log exchanges to `chat_logs` for support visibility (confirm with user — this has privacy implications, mention it if enabled).

### Phase 6 — Admin / support dashboard
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

### 3.5 Server-side: room + token creation
Create `/app/api/live/token/route.ts`:
- Auth-check the request (Supabase session).
- Look up the class by ID from `classes` table.
- **Critical gate:** query `subscriptions` for this user; if no row with `status = 'active'` and `end_date > now()`, return 403. Do this check server-side always — never trust a client-side "isSubscribed" flag.
- If the user is the trainer/admin for this class, mint a token with publish permissions (`canPublish: true`).
- Otherwise mint a token with subscribe-only permissions (`canPublish: false, canSubscribe: true`).
- Use `livekit-server-sdk`'s `AccessToken` class, set `identity` to the Supabase user id, set room name to `classes.livekit_room`.
- Token expiry: short-lived (e.g. 1 hour) since it's minted fresh per join.

### 3.6 Client-side: joining a room
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
- [ ] A user with no subscription gets a 403 when requesting a token for a premium class.
- [ ] A user with an expired subscription (`end_date` in the past) also gets a 403, not just `status != 'active'` — check both.
- [ ] Trainer can publish video/audio; viewers receive it but cannot publish.
- [ ] Token expiry doesn't break an in-progress session (test a session longer than the token TTL, or set TTL generously e.g. 3 hours to match typical class length).
- [ ] Room names are unique per class and don't collide across scheduled sessions.
- [ ] Viewer layout verified one-handed on an actual phone (or emulated at 375px width) per **Section 0.1** — controls reachable, no desktop-video-call layout shrunk down.

---

## 4. Open flags for the user (not blockers to starting, but need answers before the relevant phase)
1. PhonePe merchant account status — needed before Phase 3 goes beyond sandbox.
2. Actual subscription pricing/tiers — needed before Phase 3 schema/UI is finalized.
3. Whether chatbot conversations should be logged to `chat_logs` for support visibility (privacy tradeoff — confirm before enabling).
4. Design token sign-off — needed before Phase 1 UI work begins (see Phase 0), and must include mobile-width tokens per Section 0.1.
5. Primary target SEO keywords — needed before Phase 1 landing page copy is finalized (see Section 0.2).
6. Whether a blog/content section is in scope — affects Phase 0.5 SEO planning and Phase 1 routing.

---

## 5. Suggested execution order
Phase 0 → **Phase 0.5 (SEO foundation)** → Phase 1 → Phase 2 → Phase 3 → Phase 4 (LiveKit) → Phase 5 (Groq chatbot) → Phase 6 (admin) → Phase 7 (app).
Phases 4 and 5 are independent of each other and could be reordered or parallelized if working with more than one dev/session.
**Mobile/responsive (Section 0.1) is not a phase in this sequence — it's a standing requirement checked at every phase's "done" gate, starting with Phase 0's design tokens.**
