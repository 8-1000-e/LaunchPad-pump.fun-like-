# Token Launchpad — Solana/Anchor

A token launchpad with bonding curves on Solana, inspired by pump.fun. Create meme tokens, trade them via an automatic bonding curve, and graduate to Raydium when the market cap threshold is reached.

## Architecture

### On-chain Program (Anchor)

**Hand-written from scratch.** Every instruction, every account struct, every line of bonding curve math is written manually.

```
programs/token-lp/src/
├── lib.rs                    # Program entrypoint
├── constants.rs              # PDA seeds, defaults, fee config
├── errors.rs                 # Custom error codes
├── events.rs                 # On-chain events
├── state/
│   ├── global.rs             # Protocol config (fees, thresholds, authority)
│   ├── bonding_curve.rs      # Per-token curve state + constant-product math
│   └── referral.rs           # Referral tracking
├── instructions/
│   ├── admin/                # initialize, update_config, withdraw_fees
│   ├── launch/               # create_token, create_and_buy
│   ├── trade/                # buy, sell (with fee distribution)
│   ├── migration/            # migrate_to_raydium (LP burn)
│   └── referral/             # register_referral
└── utils/
    └── math.rs               # Checked arithmetic helpers
```

### Frontend

**Vibe-coded.** The frontend is AI-generated and iterated on for design exploration. It features a 3D WebGL bonding curve visualization (Three.js), scroll-driven cinematic transitions, and gold dust particle effects.

```
app/
└── src/
    ├── app/page.tsx          # Home page with token listing
    ├── components/
    │   ├── hero.tsx           # Hero section with parallax scroll
    │   ├── bonding-curve-3d.tsx  # Three.js 3D bonding curve
    │   ├── navbar.tsx
    │   ├── token-card.tsx
    │   └── sparkline.tsx
    └── app/globals.css        # Design system tokens
```

### SDK (TypeScript)

Client-side SDK for interacting with the program.

```
sdk/src/
├── client.ts                 # LaunchpadClient class
├── math.ts                   # Client-side curve math
├── pda.ts                    # PDA derivation
├── types.ts
└── constants.ts
```

## Bonding Curve Model

Constant product with virtual reserves (`virtual_sol * virtual_tokens = k`).

- **Virtual reserves** give a non-zero starting price without seed liquidity
- **Graduation** at 85 SOL real reserves triggers migration to Raydium CPMM
- **Fee model**: 1% trade fee split between protocol (60%), creator (30%), and referrer (10%)

## Stack

- **Program**: Anchor 0.32.1, Rust
- **Frontend**: Next.js, Tailwind CSS, Three.js (React Three Fiber)
- **Tests**: TypeScript (ts-mocha)

## Status

Work in progress — Phase 1 (Foundation) underway.
