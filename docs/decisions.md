# Decisions Log

## 2026-02-10 — Vanilla Three.js over React Three Fiber
**Context**: Attempted to use @react-three/fiber v9 for 3D bonding curve visualization in hero section.
**Decision**: Use vanilla Three.js (useRef + useEffect + THREE.WebGLRenderer) instead of R3F.
**Rationale**: R3F v9 has a fundamental incompatibility with React 19 + Next.js 16. The `<Canvas>` component crashes with `TypeError: Cannot read properties of null (reading 'alpha')` regardless of configuration. This is not fixable by removing gl props, adding mount guards, or using dynamic imports with ssr:false.
**Alternatives considered**: Downgrading to R3F v8 (requires React 18 downgrade), waiting for R3F fix (tracked at pmndrs/react-three-fiber#3471).
**Skill created**: `~/.claude/skills/brain-dump/extracted/r3f-react19-nextjs-crash/SKILL.md`

## 2026-02-10 — Webpack over Turbopack for dev server
**Context**: Next.js 16 defaults to Turbopack for dev server. Project has dual lockfiles (root yarn.lock + app/yarn.lock).
**Decision**: Always use `npx next dev --webpack` flag.
**Rationale**: Turbopack enters infinite loop with dual lockfiles. Shows "Ready" but never serves pages. No error in terminal.
**Skill created**: `~/.claude/skills/brain-dump/extracted/nextjs-turbopack-dual-lockfile/SKILL.md`

## 2026-02-10 — No UI libraries (pure Tailwind)
**Context**: Building token launchpad frontend with distinctive design.
**Decision**: Use only Tailwind CSS v4 with @theme inline tokens. No shadcn, Chakra, Radix, etc.
**Rationale**: Boss requirement. Gives full control over aesthetic. Avoids generic component library look.

## 2026-02-10 — Warm gold brand color (#c9a84c)
**Context**: Choosing brand identity for "LAUNCH" token launchpad.
**Decision**: Warm gold (#c9a84c) as primary brand, NOT the typical pump.fun green or generic crypto cyan.
**Rationale**: Distinctive, premium feel. Buy stays green (#22c55e), sell stays red (#ef4444). Gold evokes value/wealth without being generic crypto.

## 2026-02-10 — Two-column hero layout with dashboard widget
**Context**: Boss requested 3D chart be a "first-class element" not buried in background.
**Decision**: Hero section uses `grid-cols-[1fr_1fr]` — text/stats left, chart in dashboard widget right.
**Rationale**: Chart gets proper framing with header (live price) and footer (legend). Looks like a real trading interface.

## 2026-02-10 — V8: Full-screen immersive canvas (replaced dashboard widget)
**Context**: Boss wanted "Shopify Editions" feel — immersive, cinematic.
**Decision**: Chart fills entire hero section as background, content overlays on top.
**Rationale**: More impactful than a boxed widget. Hero text with gradient overlays + transparent WebGL canvas.

## 2026-02-11 — Camera tracking in animation loop, NOT data callbacks
**Context**: Chart tip escaped viewport because camera only updated when new data arrived (2-5fps), not at render speed (60fps).
**Decision**: Set `targetCamX`/`targetCamY` in `rebuildCurve()`, lerp camera in `animate()` with `3.0 * dt`.
**Rationale**: Frame-rate independent smoothing. Camera reaches 95% of target in ~1 second. No more stutter or lag.
**Skill created**: `~/.claude/skills/brain-dump/extracted/threejs-infinite-chart-camera/SKILL.md`

## 2026-02-11 — Relative Y scaling instead of absolute
**Context**: As price grew infinitely, `price / maxPrice * height` compressed the chart to a flat line at the top.
**Decision**: Map visible price range (min→max) to fixed Y range: `((price - minP) / range) * 4.5 + BOTTOM_Y` with `range = max(maxP - minP, 5)`.
**Rationale**: Chart always shows full volatility regardless of absolute price level. Minimum range of 5 prevents flat line during consolidation.

## 2026-02-11 — No graduation reset (infinite chart)
**Context**: Boss wanted truly infinite chart. Old version reset at 85 SOL graduation threshold.
**Decision**: Remove reset entirely. Curve trades forever. Graduation explosion fires once as celebration.
**Rationale**: Removing the reset + relative Y scaling + camera tracking = true infinite scrolling chart.

## 2026-02-11 — 3-layer parallax scroll system
**Context**: Boss wanted Shopify Editions-style cinematic scroll transitions.
**Decision**: Background orbs at 0.3x, 3D canvas at 0.5x, HTML content at 1x. Hero fades+blurs+zooms on scroll.
**Rationale**: Creates depth and premium feel. rAF-throttled scroll listener prevents jank.

## 2026-02-11 — Removed LIVE SOL HUD and candlestick bars
**Context**: User wanted cleaner hero. HUD and candlesticks added visual noise.
**Decision**: Removed price indicator overlay and green/red candle bars. Price data still flows (for 3D animation) but isn't displayed as text.
**Rationale**: Cleaner aesthetic. The 3D curve itself communicates price movement.

## 2026-02-11 — Backend: Pedagogical mode
**Context**: Emile wants to learn by writing the Anchor program himself.
**Decision**: Backend mentor guides and reviews but does NOT write program code unless explicitly asked. Errors/events added incrementally as needed.
**Rationale**: Learning-by-doing approach. Emile has prior Anchor experience (vault-syncit, X-RAY, Arcium) but wants to level up on DeFi/AMM patterns.

## 2026-02-11 — Backend: InitSpace over size_of
**Context**: Emile asked about account space calculation.
**Decision**: Use `#[derive(InitSpace)]` + `8 + Global::INIT_SPACE` instead of `8 + std::mem::size_of::<Global>()`.
**Rationale**: InitSpace calculates Borsh serialization size, which can differ from Rust memory layout. More reliable. Emile was already familiar with this pattern.

## 2026-02-11 — Backend: Handler pattern for instructions
**Context**: Structuring instruction code across files.
**Decision**: Each instruction file exports `pub fn handler(ctx) -> Result<()>` + `#[derive(Accounts)]` struct. `lib.rs` delegates: `instructions::admin::initialize::handler(ctx)`.
**Rationale**: Standard Anchor pattern for multi-file programs. Clean separation of concerns.

## 2026-02-11 — Backend: Errors added as-needed, not pre-planned
**Context**: Emile said "on les fera au fur et à mesure" about errors.rs.
**Decision**: Don't pre-define all errors upfront. Add to errors.rs when each instruction needs them.
**Rationale**: Avoids guessing what errors will be needed. More pragmatic.

## 2026-02-11 — Frontend: Token detail page assigned to designer
**Context**: Landing page V10+ validated by Emile.
**Decision**: Designer agent starts Token Detail / Trade page (`/token/[mint]`) with 2-column layout: chart + stats left, buy/sell form right.
**Rationale**: Most important page of the launchpad — where users actually trade.

## 2026-02-11 — lightweight-charts v5 for token chart
**Context**: Need a TradingView-style chart for the token detail page.
**Decision**: Use `lightweight-charts` v5.1.0 by TradingView. Area series with custom colors matching token.
**Rationale**: Lightweight (~40KB), well-maintained, looks professional. Free/open source. v5 API changed significantly from v4 — uses `chart.addSeries(AreaSeries, {...})` instead of `chart.seriesType()`.

## 2026-02-11 — Removed HowItWorks section from homepage
**Context**: Created a "How it works" 3-step section between hero and token grid.
**Decision**: Removed from page (file still exists). User said "c'est mal placé ici".
**Rationale**: Breaks the flow between the immersive hero and the token grid. Could be re-added on a separate "about" page or below the token grid.

## 2026-02-11 — Removed ActivityTicker (fake trade marquee)
**Context**: Created a marquee-style ticker showing fake "0x7a.. bought 2.5 SOL" messages.
**Decision**: Removed. User found the fake trade text unconvincing ("enleve les dates en mode hdgjhad bough asgda").
**Rationale**: Fake data looks fake. Better to add real websocket data later or skip entirely.

## 2026-02-11 — 5 wow effects for token detail page
**Context**: User wanted the token detail page to feel "insane" with a "whoua effect".
**Decision**: Implemented all 5 proposed effects: odometer price ticker, trade pulse overlay, mini SVG bonding curve, graduation heat (particles + glow), button particle burst.
**Rationale**: Each effect adds a different dimension — typography animation, page-level feedback, data visualization, status-driven atmosphere, and interaction delight. Together they create a highly dynamic trading page.

## 2026-02-11 — Next.js 16 dynamic route params are Promises
**Context**: Building `/token/[id]` page. TypeScript error on `params.id`.
**Decision**: Use `use()` from React to unwrap: `const { id } = use(params)` where `params: Promise<{id: string}>`.
**Rationale**: Next.js 16 changed dynamic route params to be async/Promise-based. This is the correct pattern for client components.

## 2026-02-11 — CSS color swatches: fixed-size over grid-fill
**Context**: Color picker swatches in `/create` page were ovals. Using `w-full` in a `grid-cols-6` makes elements wider than tall, so `border-radius: 50%` creates ovals.
**Decision**: Use `flex flex-wrap gap-2.5` with `h-8 w-8 shrink-0 rounded-full` instead of grid with `w-full`.
**Rationale**: Fixed dimensions guarantee perfect circles. `shrink-0` prevents flex compression.

## 2026-02-11 — Buy on Create: anti-snipe same-transaction pattern
**Context**: "Buy on Create" feature lets creators buy their own token at launch.
**Decision**: Explain it as anti-snipe: "Your buy executes in the same transaction as the token creation, no one can front-run you. Only possible at creation." Custom CSS toggle switch + pill amount selector with brand glow.
**Rationale**: Same-transaction execution is a real security feature (prevents MEV bots from front-running). Framing it as anti-snipe gives users confidence. UI uses custom CSS toggle (round knob on pill track) instead of icon-based toggle for better affordance.

## 2026-02-11 — Leaderboard: CSS 3D trophy over Three.js
**Context**: Leaderboard hero needed a trophy visual element.
**Decision**: Built trophy with pure CSS (gradients, box-shadows, keyframe rotation) instead of a 3D model in Three.js/R3F.
**Rationale**: R3F incompatible with React 19. Loading a 3D model just for a trophy is overkill. CSS trophy with floating particles and rotation animation is lightweight and looks great.

## 2026-02-11 — Leaderboard: holographic Hall of Fame cards
**Context**: Boss wanted "WOW EFFECT" for graduated tokens section.
**Decision**: Horizontal scroll of cards with gold animated border (`gradient-x` keyframe), 3D perspective transform on hover (`perspective(600px) rotateY(-3deg) rotateX(2deg) scale(1.02)`), subtle holographic feel.
**Rationale**: Graduated tokens are the success stories — they deserve special visual treatment. Holographic tilt + gold border creates a "collector's card" feel.

## 2026-02-11 — Animated counters with requestAnimationFrame
**Context**: Leaderboard hero shows stats (total tokens launched, total volume, active traders).
**Decision**: `useAnimatedCounter` hook using `requestAnimationFrame` + ease-out cubic easing (`1 - Math.pow(1 - t, 3)`), animates from 0 to target over 2 seconds.
**Rationale**: Counting up from zero creates a "reveal" moment. rAF ensures smooth 60fps animation. Ease-out cubic feels natural — fast start, smooth landing.

## 2026-02-11 — Backend: create_and_buy is NOT conditional
**Context**: Emile wrote `require!(sol_amount > 0)` in create_and_buy. Mentor suggested making the buy conditional with `if`.
**Decision**: Keep `require!(sol_amount > 0)`. If frontend doesn't want a buy, it calls `create_token` instead.
**Rationale**: Two separate instructions (`create_token` and `create_and_buy`) is cleaner than one instruction with conditional logic. The require! serves as validation, not flow control.

## 2026-02-11 — Backend: Sell fee on SOL output, not token amount
**Context**: In sell.rs, fee could be calculated on tokens received or SOL paid out.
**Decision**: Fee is always on SOL — `fee = sol_out * trade_fee_bps / 10000`. Same as buy (fee on SOL input).
**Rationale**: Consistent fee denomination (always SOL) simplifies accounting. Fee comes from the SOL output before reaching the seller.

## 2026-02-11 — Backend: PDA signs ALL SOL transfers in sell
**Context**: In sell.rs, SOL goes from bonding curve PDA to seller and to fee recipients.
**Decision**: All SOL transfers use `CpiContext::new_with_signer` with bonding curve PDA seeds. Seller only signs the token transfer.
**Rationale**: In sell, the bonding curve PDA holds the SOL — it must sign to release it. Unlike buy where the buyer signs SOL transfers directly.

## 2026-02-11 — Backend: Referral fees accumulate in PDA, not sent to wallet
**Context**: Referral fees could be sent directly to the referrer's wallet on each trade, or accumulated in the Referral PDA.
**Decision**: Fees accumulate in Referral PDA. Referrer claims via `claim_referral_fees`.
**Rationale**: Fewer transfers per trade (lower compute). Referrer pays rent for their PDA. Prevents dust attacks (many tiny transfers). Simpler trade handler.

## 2026-02-11 — Backend: Option<Account<Referral>> over UncheckedAccount
**Context**: Originally referral was `Option<UncheckedAccount>` in buy/sell.
**Decision**: Changed to `Option<Account<'info, Referral>>` with proper deserialization.
**Rationale**: UncheckedAccount doesn't validate the account data. An attacker could pass any account as "referral". Account<Referral> ensures proper deserialization + seed validation.

## 2026-02-11 — Backend: CPMM over AMM V4 for Raydium migration
**Context**: Raydium offers AMM V4 (with OpenBook market) and CPMM (standalone).
**Decision**: Use Raydium CPMM (`CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C`).
**Rationale**: CPMM doesn't require creating an OpenBook market (~3 SOL + complex multi-tx setup). Simpler CPI, fewer accounts, available on devnet. This is what pump.fun uses.

## 2026-02-11 — Backend: raydium-cp-swap crate from git
**Context**: Need to CPI into Raydium CPMM from Anchor 0.32.1 program.
**Decision**: `raydium-cp-swap = { git = "https://github.com/raydium-io/raydium-cp-swap", features = ["no-entrypoint", "cpi"] }`
**Rationale**: Crate built for Anchor 0.29 but compiles fine with 0.32.1. Provides account structs (AmmConfig, PoolState) and CPI helpers. No version conflicts.

## 2026-02-12 — Wallet adapter with custom UI (no wallet-adapter-react-ui)
**Context**: Implementing Solana wallet connection for the frontend.
**Decision**: Use `@solana/wallet-adapter-react` for logic only. Build custom wallet modal + connected dropdown. Do NOT use `@solana/wallet-adapter-react-ui`.
**Rationale**: The official UI package has a generic blue/purple style that clashes with the gold/dark design system. Custom UI matches the DA perfectly.

## 2026-02-12 — Direct import over next/dynamic for client components in layout.tsx
**Context**: Wrapping children with WalletProviderWrapper in `layout.tsx` (Server Component).
**Decision**: Import `WalletProviderWrapper` directly. Do NOT use `next/dynamic` with `{ ssr: false }`.
**Rationale**: Next.js 16 explicitly forbids `ssr: false` in `next/dynamic` inside Server Components. Build error: "ssr: false is not allowed with next/dynamic in Server Components." The `"use client"` directive in the component already creates the client boundary — Next.js handles SSR/hydration automatically.
**Skill created**: `~/.claude/skills/brain-dump/extracted/nextjs16-dynamic-ssr-false-server-component/SKILL.md`

## 2026-02-12 — @solana/web3.js@1 (not v2) for wallet adapter compatibility
**Context**: Installing Solana web3.js for wallet connection.
**Decision**: Pin to `@solana/web3.js@1` (v1.x), not the newer v2.
**Rationale**: `@solana/wallet-adapter-react` and all wallet adapter packages still depend on web3.js v1. The v2 rewrite has a completely different API and isn't compatible yet.

## 2026-02-12 — --legacy-peer-deps for wallet adapter packages
**Context**: Installing wallet adapter packages with React 19.
**Decision**: Always use `npm install --legacy-peer-deps` for wallet adapter packages.
**Rationale**: Wallet adapter packages declare `peerDependencies: { "react": "^17 || ^18" }` — they don't officially support React 19 yet but work fine. `--legacy-peer-deps` skips the strict check.

## 2026-02-12 — Unicorn Studio over Spline for 3D background
**Context**: Wanted animated 3D particle background for the token grid section.
**Decision**: Use Unicorn Studio embed (`data-us-project`) instead of Spline iframe.
**Rationale**: Spline iframe had a white background that couldn't be fully removed (even with CSS invert/filter). Unicorn Studio has transparent background by default and offers `data-us-disablemouse` attribute to disable cursor interaction. Script loaded dynamically, desktop only.

## 2026-02-12 — CSS filter chain for gold-tinting embedded 3D
**Context**: Unicorn Studio 3D effect was purple/blue, needed to match gold DA.
**Decision**: Apply `filter: sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85)` to the embed container.
**Rationale**: `sepia(1)` converts to warm brown, `saturate(2)` intensifies, `hue-rotate(5deg)` shifts slightly toward gold. Higher hue-rotate values (35deg) made it green. 5deg is the sweet spot.

## 2026-02-12 — Referral dashboard in profile page, not separate page
**Context**: Pentagon pod mentor ordered a "Referral Dashboard page."
**Decision**: Integrated referral dashboard features into the existing `/profile/[address]` Referrals tab instead of creating a new `/referral` page.
**Rationale**: The profile page already has a Referrals tab. Adding register/link/stats/claim there (with own-profile detection via `useWallet()`) is more cohesive than a separate page.

## 2026-02-12 — Project split: token-lp (backend) + Launch (frontend)
**Context**: Frontend was originally in `token-lp/app/` alongside the Anchor program.
**Decision**: Frontend moved to `/Users/emile/Documents/learn/Dev Journey/Launch/app/`. Backend stays in `token-lp/`.
**Rationale**: User reorganized project structure. Both directories have their own CLAUDE.md and docs/.

## 2026-02-15 — Creator fee: 65% of trade fees to token creator
**Context**: `creator_share_bps` existed in Global config but was never used — 100% of fees went to `fee_vault`.
**Decision**: Implement 3-way fee split: creator (65%) → referral (10% of remainder) → protocol (rest). Creator gets their share first, then remaining is split.
**Rationale**: Token creators are incentivized to promote their tokens. 65% is generous but aligns with pump.fun-style tokenomics where creator engagement drives volume.
**Alternatives considered**: 30% (too low per Emile), 50/50 split, percentage of total volume instead of fees.

## 2026-02-15 — Skip creator self-transfer in create_and_buy
**Context**: In `create_and_buy`, the creator is the signer who also pays fees.
**Decision**: Calculate creator_fee but skip the actual transfer (creator would pay themselves).
**Rationale**: Saves compute units. The math still uses `remaining_fee` (after creator share) for referral/protocol split, so the fee distribution is consistent.

## 2026-02-15 — Tests use SDK client, not raw Anchor program calls
**Context**: Tests were calling `program.methods.xxx().rpc()` directly.
**Decision**: Rewrite all tests to use `TokenLaunchpadClient` from `sdk/src/client.ts` via `clientFor(keypair)` helper.
**Rationale**: (1) Surfaces SDK bugs — found 5 through this approach. (2) Tests serve as SDK integration tests. (3) Tests mirror how the frontend will use the SDK.

## 2026-02-15 — SDK error parsing: parseError() + sendTx() wrapper
**Context**: Anchor 0.32 `Program` doesn't parse errors for non-default providers → "Unknown action 'undefined'".
**Decision**: SDK wraps all `.rpc()` calls in `sendTx()` which catches errors and passes them through `parseError()`. `parseError()` extracts `AnchorError` from `SendTransactionError.logs` using `AnchorError.parse(logs)`.
**Rationale**: Frontend needs proper error codes (e.g., `SlippageExceeded`) for UX. This is a client-side fix for an Anchor bug.
**Skill created**: `~/.claude/skills/brain-dump/extracted/anchor-sdk-error-parsing-wrapper/SKILL.md`
