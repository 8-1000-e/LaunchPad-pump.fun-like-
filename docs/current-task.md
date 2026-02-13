# Current Task — Raydium CPMM Migration (Phase 5)

## What Was Done This Session

### 1. create_and_buy.rs — Handler Complete
- Full handler: creates token (init bonding curve, mint_to, metadata CPI) + atomic first buy
- No slippage check (first buyer, deterministic price)
- `require!(sol_amount > 0)` — if frontend doesn't want to buy, it calls `create_token` instead
- Status check added: `require!(global.status != ProgramStatus::Paused)`
- Builds clean

### 2. sell.rs — Handler Complete (Step-by-Step)
- Mirror of buy.rs with reversed CPI signing
- Fee on `sol_out` (not token_amount): `fee = sol_out * bps / 10000`
- Transfer 1: tokens seller→bonding_curve (`CpiContext::new`, token_program, seller signs)
- Transfer 2: SOL bonding_curve→seller (`CpiContext::new_with_signer`, system_program, PDA signs)
- All fee transfers from PDA with `CpiContext::new_with_signer` + `&binding`
- State: `virtual_sol -= sol_out`, `virtual_token += token_amount`, `real_sol -= sol_out`, `real_token += token_amount`
- Referral integration: `Option<Account<'info, Referral>>`

### 3. calculate_sell_amount — Added to math.rs
- `sol_out = (virtual_sol * token_amount) / (virtual_token + token_amount)`
- Mirror of calculate_buy_amount with sol/token swapped

### 4. register_referral.rs — Complete
- Creates Referral PDA with `seeds = [REFERRAL_SEED, user.key().as_ref()]`
- Sets referrer, total_earned=0, trade_count=0, bump
- Uses existing `Referral` struct from state

### 5. claim_referral_fees.rs — Complete
- Withdraws lamports from Referral PDA (rent-protected)
- `minimum_balance(8 + Referral::INIT_SPACE)` for correct rent
- `.to_account_info().lamports()` pattern (Account<T> doesn't have .lamports() directly)
- Constraint: `referral.referrer == user.key()`

### 6. Referral Integration into buy.rs + sell.rs
- Changed `Option<UncheckedAccount>` → `Option<Account<'info, Referral>>`
- Added `referral.total_earned += referral_fee; referral.trade_count += 1;`
- Fee sent to Referral PDA, referrer claims via `claim_referral_fees`

### 7. Security Audit — Full Program
- CRITICAL: No input validation in update_config (admin can set fee_bps > 10000)
- CRITICAL: Integer underflow in `sol_amount - fee` needs checked_sub
- HIGH: Sell blocked on completed curve (users locked until migration)
- HIGH: State updates after CPIs (should be checks-effects-interactions)
- MEDIUM: No events emitted, no string length validation
- Status checks added to create_token and create_and_buy (was missing)

### 8. migrate_to_raydium.rs — Struct Partially Written
- Copied Raydium CPMM accounts from official example
- Added bonding_curve + mint + fee_vault accounts
- Fixed: removed `init` from mint/bonding_curve (already exist at migration time)

## What's Next — Immediate

### 1. Fix migrate_to_raydium.rs struct (remaining issues)
- Lines 101/109: `token::authority = creator` → `token::authority = bonding_curve` (creator doesn't exist in struct)
- `fee_vault` needs `mut` (migration fee gets sent there)
- wSOL wrapping: bonding curve holds raw SOL lamports, Raydium needs wrapped SOL token accounts
- Need to add wSOL-related accounts (WSOL mint, wrapping accounts)

### 2. Write migrate_to_raydium.rs handler
Roadmap:
1. Validations (authority == global.admin, curve completed, not already migrated)
2. Migration fee: transfer 0.5 SOL from bonding curve to fee_vault
3. Wrap remaining SOL into wSOL token account
4. CPI to Raydium CPMM `initialize` (creates pool with token + wSOL)
5. Burn LP tokens (or send to dead address)
6. Mark `bonding_curve.migrated = true`

### 3. Security audit fixes
- Input validation in update_config (cap fee_bps, validate virtual_sol > 0)
- checked_sub for fee calculations in buy/sell

### 4. Events (events.rs)
- TokenCreated, TokenBought, TokenSold, CurveGraduated, Migrated

### 5. Tests
- 01_admin.test.ts through 05_migration.test.ts

## Known Issues
- `events.rs` still empty
- No tests written yet
- Security audit items not yet fixed
