# Token Launchpad — CLAUDE.md

## Context Recovery

IMPORTANT: At session start, read all .md files in the /docs/ directory to restore full project context from the previous session.

## Current State

- **Branch**: main
- **Status**: All trading + referral instructions complete. Migration to Raydium CPMM in progress (struct partially written, handler not started).
- **Last updated**: 2026-02-11
- **Dev server**: `npx next dev --webpack --port 3001` (MUST use --webpack flag, Turbopack hangs with dual lockfiles)

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
- [x] `lib.rs` — all 7 instructions wired
- [x] `anchor build` passes ✅
- [ ] `events.rs` (still empty — add events as needed)
- [ ] Tests (01_admin through 05_migration)

### Phase 2: Token Launch ✅
- [x] `create_token.rs` — full handler: init bonding curve, mint_to total supply, CPI create_metadata_accounts_v3, status check
- [x] `create_and_buy.rs` — full handler: create + atomic first buy, no slippage check (first buyer)

### Phase 3: Trading ✅
- [x] `buy.rs` — full handler with fee calc, SOL transfer, token transfer (PDA signs), referral integration, graduation check
- [x] `sell.rs` — full handler: mirror of buy. Fee on SOL output. Seller signs for tokens, PDA signs for SOL + fees. State update reversed.

### Phase 4: Referrals ✅
- [x] `register_referral.rs` — creates Referral PDA with seeds ["referral", user.key()]
- [x] `claim_referral_fees.rs` — withdraw accumulated lamports from Referral PDA (rent-protected)
- [x] Referral integrated into buy.rs and sell.rs — `Option<Account<'info, Referral>>` replaces `UncheckedAccount`
- [x] Referral stats updated on each trade (total_earned, trade_count)

### Phase 5: Migration (IN PROGRESS) ← CURRENT
- [ ] `migrate_to_raydium.rs` — struct partially written (copied from raydium-cpi-example), needs fixes
- [ ] Handler not started
- [ ] Raydium CPMM dependency added (`raydium-cp-swap` crate), compiles with Anchor 0.32.1
- [ ] `05_migration.test.ts`

### Phase 6: Post-MVP
- [ ] Security audit fixes (input validation in update_config, checked_sub for fee calcs)
- [ ] Events (TokenCreated, TokenBought, TokenSold, CurveGraduated)
- [ ] SDK (`sdk/src/client.ts`, `math.ts`, `pda.ts`, `types.ts`, `constants.ts`)
- [ ] Tests

## Security Audit Summary (2026-02-11)

### CRITICAL
1. **No input validation in update_config** — admin can set trade_fee_bps > 10000 (underflow), virtual_sol = 0 (divzero)
2. **Integer underflow** in `sol_amount - fee` / `sol_out - fee` — needs checked_sub

### HIGH
3. No status check in create_token/create_and_buy → FIXED this session
4. Sell blocked on completed curve (users locked until migration)
5. State updates after CPIs (should be checks-effects-interactions)

### MEDIUM
6. No events emitted (events.rs empty)
7. Referrer was UncheckedAccount → FIXED this session (now Account<Referral>)
8. No string length validation on name/symbol/uri

## Key Decisions — Backend

- **Anchor 0.32.1**: Kept the version from `anchor init`
- **InitSpace over size_of**: `#[derive(InitSpace)]` + `INIT_SPACE`
- **Handler pattern**: Each instruction has `pub fn _handler(ctx) -> Result<()>` + `#[derive(Accounts)]` struct
- **Program ID**: `HY3g1uQL2Zki1aFVJvJYZnMjZNveuMJhU22f9BucN3X`
- **Multiple error enums**: AdminError, MathError, TradeError (per domain)
- **create_and_buy for anti-snipe**: Atomic create+buy prevents snipers
- **PDA signer seeds pattern**: `let mint_key = ...; let seeds = &[SEED, mint_key.as_ref(), &[bump]]; let binding = [signer_seeds]; ... &binding`
- **Constant-product bonding curve**: `tokens_out = (virtual_token * sol_amount) / (virtual_sol + sol_amount)`
- **CPMM over AMM V4 for migration**: No OpenBook market needed, simpler
- **Referral fees accumulate in PDA**: Not sent to wallet directly. Referrer claims via `claim_referral_fees`
- **Sell fees from PDA**: In sell, ALL SOL transfers (to seller + fees) come from bonding curve PDA with `CpiContext::new_with_signer`
- **No slippage in create_and_buy**: First buyer, price is deterministic
- **raydium-cp-swap crate**: Compatible with Anchor 0.32.1 despite being built for 0.29
- **NEVER mention Claude in commits**

## Key Decisions — Frontend

- **Vanilla Three.js over R3F**: @react-three/fiber v9 incompatible with React 19 + Next.js 16
- **--webpack flag**: Turbopack infinite-loops with dual lockfiles
- **Design system**: warm gold (#c9a84c) brand, dark theme (#0c0a09), Space Grotesk display, Geist Sans/Mono
- **No UI libraries**: Pure Tailwind CSS v4 only

## Pentagon Pod

- Pod ID: 3C9AC32C-7212-40A6-A862-ECE7904ACA9C
- Backend Mentor: Agent 6E9A0C3D (guides Emile, reviews code, coordinates frontend agent)
- Frontend Designer: Agent 0B779A7E (builds UI, takes orders via DISCUSSION.md)
- Communication: Pod DISCUSSION.md

## Critical File Paths

### Backend (programs/token-lp/src/)
- `lib.rs:15-69` — #[program] module with 7 instructions wired
- `constants.rs` — all PDA seeds + defaults (MIGRATION_FEE = 0.5 SOL)
- `errors.rs` — AdminError + MathError + TradeError enums
- `state/global.rs` — Global struct + ProgramStatus enum
- `state/bonding_curve.rs` — BondingCurve struct (virtual_sol/token, real_sol/token, completed, migrated)
- `state/referral.rs` — Referral struct (referrer, total_earned, trade_count, bump)
- `instructions/admin/initialize.rs` — handler + Initialize accounts
- `instructions/admin/update_config.rs` — handler with Option<T> params
- `instructions/admin/withdraw_fees.rs` — handler with checked_sub rent protection
- `instructions/launch/create_token.rs` — full handler with status check
- `instructions/launch/create_and_buy.rs` — full handler: create + atomic buy
- `instructions/trade/buy.rs` — full handler with referral integration (Option<Account<Referral>>)
- `instructions/trade/sell.rs` — full handler: mirror of buy, PDA signs all SOL transfers
- `instructions/referral/register_referral.rs` — creates Referral PDA
- `instructions/referral/claim_fees.rs` — withdraw from Referral PDA
- `instructions/migration/migrate_to_raydium.rs` — struct partially written ← CURRENT
- `utils/math.rs` — calculate_buy_amount + calculate_sell_amount

### Frontend (app/src/)
- `components/bonding-curve-3d.tsx` — vanilla Three.js 3D chart
- `components/hero.tsx` — desktop: immersive 3D; mobile: compact
- `app/page.tsx` — home page with scroll-snap
- `app/token/[id]/page.tsx` — token detail + trade
- `app/create/page.tsx` — create token form
- `app/leaderboard/page.tsx` — 3 tabs, podium, tables
- `app/profile/[address]/page.tsx` — profile with heatmap, 4 tabs
