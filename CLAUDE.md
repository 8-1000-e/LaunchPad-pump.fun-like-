# Token Launchpad — CLAUDE.md

## Context Recovery

IMPORTANT: At session start, read all .md files in the /docs/ directory to restore full project context from the previous session.

## Current State

- **Branch**: main (+ `programs` branch = subtree of `programs/token-lp/`)
- **Status**: Program complete. Tests complete (28/28). Creator fees implemented (65%). Tests rewritten to use SDK. SDK bugs documented.
- **Last updated**: 2026-02-15
- **Dev server**: `cd app/ && npx next dev --webpack --port 3001` (MUST use --webpack flag, Turbopack hangs with dual lockfiles)
- **Frontend location**: `/Users/emile/Documents/learn/Dev Journey/Launch/app/`
- **Backend location**: `/Users/emile/Documents/learn/Dev Journey/Launch/programs/token-lp/`
- **Git push**: `push-launch` alias = push main + subtree push programs (`git subtree push --prefix programs/token-lp origin programs`)

## Approach

**PEDAGOGICAL MODE** — Emile writes the program code himself, the backend mentor agent guides and reviews. The mentor does NOT write program code unless explicitly asked. Errors/events are added as needed (not pre-planned).

## Task Progress — Backend (Anchor Program)

### Phase 1: Foundation ✅
- [x] Project architecture (all directories and files created)
- [x] `constants.rs` — PDA seeds, bonding curve defaults, fees, graduation
- [x] `state/global.rs` — Global config struct with InitSpace + ProgramStatus enum
- [x] `state/bonding_curve.rs` — BondingCurve struct with InitSpace
- [x] `state/referral.rs` — Referral struct with InitSpace
- [x] `state/mod.rs` — module exports
- [x] `instructions/admin/initialize.rs` — handler + Initialize accounts struct
- [x] `instructions/admin/update_config.rs` — handler with Option<T> params + UpdateConfig accounts
- [x] `instructions/admin/withdraw_fees.rs` — handler with checked_sub rent protection + WithdrawFees accounts
- [x] `errors.rs` — AdminError (NotEnoughLamports, ProgramPaused) + MathError (Overflow, DivisionByZero) + TradeError (SlippageExceeded, CurveCompleted, ZeroAmount, ProgramPaused, NotEnoughTokens)
- [x] `utils/math.rs` — calculate_buy_amount + calculate_sell_amount with u128 checked math
- [x] Cargo.toml — anchor-spl with metadata feature, init-if-needed feature, raydium-cp-swap crate
- [x] All `mod.rs` files wired with `pub use *`
- [x] `lib.rs` — all 10 instructions wired
- [x] `anchor build` passes ✅
- [x] `events.rs` — TradeEvent, CreateEvent, CompleteEvent, MigrateEvent + emit!() in all handlers

### Phase 2: Token Launch ✅
- [x] `create_token.rs` — full handler: init bonding curve, mint_to total supply, CPI create_metadata_accounts_v3, status check, freeze authority revoke, CreateEvent
- [x] `create_and_buy.rs` — full handler: create + atomic first buy with min_tokens_out slippage, freeze authority revoke, referral split, CreateEvent + TradeEvent + CompleteEvent

### Phase 3: Trading ✅
- [x] `buy.rs` — full handler with checked arithmetic, fee calc, SOL transfer, token transfer (PDA signs), referral split + PDA validation, graduation check, TradeEvent + CompleteEvent
- [x] `sell.rs` — full handler: sub_lamports for SOL from bonding curve, rent exemption check, referral split + PDA validation, TradeEvent

### Phase 4: Referrals ✅
- [x] `register_referral.rs` — creates Referral PDA with seeds ["referral", user.key()]
- [x] `claim_referral_fees.rs` — withdraw accumulated lamports from Referral PDA (rent-protected)
- [x] Referral integrated into buy.rs and sell.rs — `Option<Account<'info, Referral>>` replaces `UncheckedAccount`
- [x] Referral stats updated on each trade (total_earned, trade_count)

### Phase 5: Migration ✅
- [x] `migrate_to_raydium.rs` — full handler: migration fee via sub_lamports, CPI Raydium CPMM initialize, LP token burn, has_one = authority (admin-only), MigrateEvent

### Phase 6: Security Audit ✅
- [x] All critical/high/medium bugs from audit fixed
- [x] Checked arithmetic everywhere (checked_add/sub/mul/div + u64::try_from with CastOverflow)
- [x] Input validation in update_config (reserves > 0, fee_bps <= 5000, combined shares <= 10000)
- [x] Referral PDA validation via find_program_address in handlers
- [x] DEPLOYER_PUBKEY constraint on initialize
- [x] Freeze authority revoked at token creation
- [x] Rent exemption check in sell
- [x] withdraw_fees uses CPI transfer with fee_vault signer seeds (not sub_lamports on SystemAccount)

### Phase 7: Creator Fees + SDK Tests ✅
- [x] Creator fees implemented: 65% of trade fees go to token creator (`creator_share_bps = 6500`)
- [x] Three-way fee split: creator (65%) → referral (10% of remainder) → protocol (remainder)
- [x] `creator_account: SystemAccount` added to Buy/Sell structs with `constraint = creator_account.key() == bonding_curve.creator`
- [x] Tests rewritten using SDK (`TokenLaunchpadClient`) — 28/28 passing
- [x] SDK bugs documented in pod DISCUSSION.md (5 bugs found)
- [x] Migration status check added (`require!` ProgramPaused)
- [x] Safe timestamp cast (`u64::try_from` instead of `as u64`)

### Phase 8: SDK (Handmade by Emile) ✅
- [x] `sdk/src/constants.ts` — Program ID, seeds, defaults (BN strings for large numbers)
- [x] `sdk/src/types.ts` — Global, BondingCurve, Referral interfaces + ProgramStatus type
- [x] `sdk/src/pda.ts` — 4 PDA derivers + getMetadataPda
- [x] `sdk/src/math.ts` — calculateBuyAmount, calculateSellAmount (constant product)
- [x] `sdk/src/client.ts` — TokenLaunchpadClient: 10 instructions + 3 fetch + error parsing
- [x] `sdk/src/index.ts` — barrel export
- [x] All 5 SDK bugs fixed (error parsing, package.json, export typo, ATA, double fetch)
- [x] SDK compiles clean (`npx tsc --noEmit --esModuleInterop --resolveJsonModule --skipLibCheck`)

### Phase 9: Next Steps
- [ ] Migration tests (05_migration.test.ts — currently empty)
- [ ] Close instruction (reclaim bonding curve rent after migration)
- [ ] Delayed open_time in migration (anti-snipe for Raydium pool)
- [ ] Connect frontend to real program (devnet deploy)

## Task Progress — Frontend

- [x] Landing page V10+ (hero with 3D bonding curve, token grid, scroll transitions)
- [x] Landing page polish: footer, scroll indicator in hero, floating CTA button
- [x] Token detail / trade page (`/token/[id]`) — full 2-column layout with wow effects
- [x] Token detail: banner image per token (gradient from token.color) + social links
- [x] Mobile responsive: hero compact (no 3D), 2-col token grid, no scroll effects
- [x] Desktop scroll-snap between hero and token list (proximity, smooth)
- [x] Create token page (`/create`) — form with color picker, banner upload, drag & drop image, buy-on-create toggle
- [x] Leaderboard page (`/leaderboard`) — 3 tabs, animated hero stats, CSS trophy, podium, hall of fame
- [x] Profile page (`/profile/[address]`) — procedural banner/identicon, stats, heatmap, 4 tabs
- [x] Solana wallet connection (Phantom + Solflare) — custom UI, devnet, auto-reconnect
- [x] Navbar: real wallet modal + connected dropdown + balance display + "My Profile" link
- [x] Profile referral dashboard: register button, referral link copy, claimable balance, claim button (own profile only)
- [x] Unicorn Studio 3D particle background for token grid section (gold-tinted, no mouse interaction)
- [x] Cross-fade transition: hero 3D bonding curve fades out → Unicorn Studio fades in on scroll
- [ ] Clean up orphan files: `how-it-works.tsx`, `activity-ticker.tsx`

## Fee Architecture

- `trade_fee_bps = 100` (1% of SOL on every buy/sell)
- `creator_share_bps = 6500` (65% of fee → token creator)
- `referral_share_bps = 1000` (10% of remaining fee → referrer, if present)
- Protocol gets the remainder
- Example: 1 SOL trade → 0.01 SOL fee → 0.0065 creator, 0.00035 referral, 0.00315 protocol

## SDK Bugs (Found 2026-02-15)

1. ~~**CRITICAL**: Error parser broken for non-default providers~~ → **FIXED**: `parseError()` + `sendTx()` wrapper extracts AnchorError from transaction logs
2. ~~**MEDIUM**: `package.json` was empty~~ → **FIXED** by Ganymede
3. ~~**MEDIUM**: `index.ts` exports `"./clients"`~~ → **FIXED**: corrected to `"./client"`
4. ~~**LOW**: `allowOwnerOffCurve` inconsistency~~ → **FIXED**: Anchor 0.32 auto-resolves ATAs, no longer passed manually
5. ~~**LOW**: Double bonding curve fetch~~ → **FIXED**: `buyToken`/`sellToken` accept optional `creator?: PublicKey` param

## Security Audit Summary (2026-02-11)

### CRITICAL
1. **No input validation in update_config** — admin can set trade_fee_bps > 10000 (underflow), virtual_sol = 0 (divzero)
2. **Integer underflow** in `sol_amount - fee` / `sol_out - fee` — needs checked_sub

### HIGH
3. No status check in create_token/create_and_buy → FIXED
4. Sell blocked on completed curve (users locked until migration)
5. State updates after CPIs (should be checks-effects-interactions)

### MEDIUM
6. No events emitted (events.rs empty)
7. Referrer was UncheckedAccount → FIXED (now Account<Referral>)
8. No string length validation on name/symbol/uri

## Key Decisions — Backend

- **Anchor 0.32.1**: Kept the version from `anchor init`
- **InitSpace over size_of**: `#[derive(InitSpace)]` + `INIT_SPACE`
- **Handler pattern**: Each instruction has `pub fn _handler(ctx) -> Result<()>` + `#[derive(Accounts)]` struct
- **Program ID**: `GzXpRdSJRrd9qqbigtawUFAqjf39inX5Zju7sZDSpdJx`
- **Multiple error enums**: AdminError, MathError, TradeError (per domain)
- **create_and_buy for anti-snipe**: Atomic create+buy prevents snipers
- **PDA signer seeds pattern**: `let mint_key = ...; let seeds = &[SEED, mint_key.as_ref(), &[bump]]; let binding = [signer_seeds]; ... &binding`
- **Constant-product bonding curve**: `tokens_out = (virtual_token * sol_amount) / (virtual_sol + sol_amount)`
- **CPMM over AMM V4 for migration**: No OpenBook market needed, simpler
- **Referral fees accumulate in PDA**: Not sent to wallet directly. Referrer claims via `claim_referral_fees`
- **Sell fees from PDA**: In sell, ALL SOL transfers (to seller + fees) come from bonding curve PDA with `CpiContext::new_with_signer`
- **No slippage in create_and_buy**: First buyer, price is deterministic
- **raydium-cp-swap crate**: Compatible with Anchor 0.32.1 despite being built for 0.29
- **Creator fees (65%)**: Token creator receives `creator_share_bps` of every trade fee. Remaining split between referral and protocol.
- **NEVER mention Claude in commits**

## Key Decisions — Frontend

- **Vanilla Three.js over R3F**: @react-three/fiber v9 incompatible with React 19 + Next.js 16
- **--webpack flag**: Turbopack infinite-loops with dual lockfiles
- **Design system**: warm gold (#c9a84c) brand, dark theme (#0c0a09), Space Grotesk display, Geist Sans/Mono
- **No UI libraries**: Pure Tailwind CSS v4 only
- **Wallet adapter with custom UI**: `@solana/wallet-adapter-react` for logic, NO `@solana/wallet-adapter-react-ui` (too generic/blue). Custom wallet modal + connected dropdown matching gold/dark DA.
- **Direct import for client components in layout.tsx**: Do NOT use `next/dynamic` with `{ ssr: false }` in Server Components (Next.js 16 error). Just import `"use client"` components directly — Next.js handles the boundary.
- **Unicorn Studio for token section background**: `data-us-project="cqcLtDwfoHqqRPttBbQE"` with `data-us-disablemouse` to disable cursor interaction. Gold-tinted via CSS filter `sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85)`.
- **Cross-fade between hero and token section**: Hero (Three.js bonding curve) fades out with `Math.pow` ease + blur. Unicorn Studio fades in overlapping at `scrollProgress > 0.2`.

## Pentagon Pod

- Pod ID: 3C9AC32C-7212-40A6-A862-ECE7904ACA9C
- Backend Mentor: Agent 6E9A0C3D (guides Emile, reviews code, coordinates frontend agent)
- Frontend Designer: Agent 0B779A7E (builds UI, takes orders via DISCUSSION.md)
- Communication: Pod DISCUSSION.md

## Critical File Paths

### Backend (programs/token-lp/src/)
- `lib.rs` — #[program] module with 10 instructions wired
- `constants.rs` — all PDA seeds + defaults (MIGRATION_FEE = 0.5 SOL, CREATOR_SHARE_BPS = 6500)
- `errors.rs` — AdminError + MathError + TradeError enums
- `state/global.rs` — Global struct + ProgramStatus enum
- `state/bonding_curve.rs` — BondingCurve struct (virtual_sol/token, real_sol/token, completed, migrated, creator)
- `state/referral.rs` — Referral struct (referrer, total_earned, trade_count, bump)
- `instructions/trade/buy.rs` — handler with 3-way fee split (creator + referral + protocol) + `creator_account` in accounts
- `instructions/trade/sell.rs` — mirror of buy, PDA signs all SOL transfers, 3-way fee split
- `instructions/launch/create_and_buy.rs` — create + atomic buy, skips creator self-transfer
- `instructions/migration/migrate_to_raydium.rs` — Raydium CPMM CPI, status check, safe timestamp cast
- `utils/math.rs` — calculate_buy_amount + calculate_sell_amount

### SDK (sdk/src/)
- `client.ts` — TokenLaunchpadClient class (all instructions as methods)
- `pda.ts` — PDA derivation helpers
- `math.ts` — buy/sell amount calculation (mirrors utils/math.rs)
- `constants.ts` — default values matching constants.rs
- `types.ts` — TypeScript types

### Tests (tests/)
- `helpers/setup.ts` — provider, adminClient, clientFor(keypair), expectRevert()
- `helpers/index.ts` — re-exports from setup + SDK (pda, math, constants)
- `01_admin.test.ts` — initialize, update_config, withdraw_fees
- `02_launch.test.ts` — create_token, create_and_buy_token
- `03_trade.test.ts` — buy, sell, round-trip, graduation, SDK math verification
- `04_referral.test.ts` — register, buy-with-referral (3-way fee split), claim, auth checks

### Frontend (app/src/)
- `components/wallet-provider.tsx` — Solana wallet ConnectionProvider + WalletProvider
- `components/navbar.tsx` — sticky navbar with real wallet connection
- `app/page.tsx` — home page with scroll-snap, cross-fade
