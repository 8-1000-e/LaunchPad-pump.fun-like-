# Debugging Notes

## R3F v9 + React 19 Canvas Crash (2026-02-10)
### Symptoms
- `TypeError: Cannot read properties of null (reading 'alpha')` at `<Canvas>` JSX
- Error persists with ANY configuration of the Canvas component
- Error persists with `ssr: false` dynamic imports
- Error persists after removing `gl` prop, using `onCreated` callback, adding mount guards
### Root Cause
Fundamental incompatibility between @react-three/fiber v9.5.0 and react@19.2.3 + next@16.1.6. The R3F renderer fails during internal WebGL context initialization before any user code runs.
### Fix
Replaced R3F entirely with vanilla Three.js using `useRef<HTMLDivElement>` + `useEffect` + `new THREE.WebGLRenderer()`. Uninstalled @react-three/fiber, @react-three/drei, @react-three/postprocessing.
### Gotcha
`three` package still needed. Only the React wrappers are broken.

## Turbopack Dual Lockfile Hang (2026-02-10)
### Symptoms
- `npx next dev` says "Ready in 500ms" but localhost:3000 never loads
- `curl localhost:3000` hangs indefinitely
- No errors in terminal
- Warning: "We detected multiple lockfiles"
### Root Cause
Project has `yarn.lock` at root (Anchor/Solana) and `app/yarn.lock` (Next.js). Turbopack can't handle this.
### Fix
Use `npx next dev --webpack --port 3001` (port 3001 since 3000 may be occupied).

## TypeScript: instanceMatrix not on custom type (2026-02-10)
### Symptom
`Property 'instanceMatrix' does not exist on type 'Explosion'`
### Fix
Removed redundant line `exp.instanceMatrix = exp.mesh.instanceMatrix`. The next line `exp.mesh.instanceMatrix.needsUpdate = true` was sufficient.

## Chart Stuck at Top — Absolute Y Scaling (2026-02-11)
### Symptoms
- Chart tip visually stuck at the very top of the viewport
- As price grows, the entire chart compresses into a thin line at the top
- Camera at Y=0.5 while tip is at Y=3.0+ (off-screen above center)
- Chart "never goes down" — sells have no visible effect because absolute scale compresses everything
### Root Cause (Phase 1)
Using absolute Y scaling: `(price / maxPrice) * 4.5 + BOTTOM_Y`. As `maxPrice` grows infinitely, all Y values compress toward `BOTTOM_Y`. The upward bias multiplier was uncapped (`progress * 2.2` where progress = price/85 which grows beyond 1.0), making sells ineffective.
### Fix (Phase 1 — Relative Scaling)
- Capped progress: `Math.min(1, price / GRAD_PRICE)`
- Reduced bias: `progress * 2.2` → `progress * 1.2`
- Switched to relative Y scaling: `((price - minP) / range) * 4.5 + BOTTOM_Y` with `range = max(maxP - minP, 5)`

### Symptoms (Phase 2 — still stuck after relative scaling)
- Relative scaling works (chart fills vertical range) but tip is always at the TOP of the range
- In an uptrend, tip = maxP = top of range → always maps to `4.5 + BOTTOM_Y` ≈ 3.0
- Camera Y fixed at 0.5 → tip appears at very top of viewport
### Root Cause (Phase 2)
Camera Y was not tracking the tip. Camera only followed X (horizontal). The tip's Y position changed with relative scaling but camera stayed at initial Y.
### Fix (Phase 2 — Camera Y Tracking)
```js
let targetCamY = 0.5;
// In rebuildCurve():
targetCamY = tip.y - 0.5;  // tip slightly above center
// In animate():
camera.position.y += (targetCamY - camera.position.y) * 3.0 * dt;
// Initial snap:
camera.position.y = targetCamY;
```
### Key Insight
Camera tracking MUST happen in the animation loop (60fps), not in data callbacks (2-5fps). Set targets in data, lerp in render. This applies to both X and Y axes. See skill: `threejs-infinite-chart-camera`.

## lightweight-charts v5 API Breaking Change (2026-02-11)
### Symptom
`Property 'seriesType' does not exist on type 'IChartApi'` — TypeScript error when using `chart.addSeries(chart.seriesType("Area"), {...})`
### Root Cause
lightweight-charts v5 changed its API. The `seriesType()` method no longer exists. Series types are now exported as named imports.
### Fix
```ts
// Wrong (v4 pattern):
chart.addSeries(chart.seriesType("Area"), { ... });

// Correct (v5 pattern):
import { AreaSeries } from "lightweight-charts";
chart.addSeries(AreaSeries, { ... });
```
### Gotcha
Must also import `ColorType`, `CrosshairMode`, `LineStyle` as named exports from `lightweight-charts`.

## ReferenceError: livePrice is not defined (2026-02-11)
### Symptom
`ReferenceError: livePrice is not defined` at `hero.tsx:170` after removing HUD code
### Root Cause
Edit to remove the LIVE SOL HUD didn't fully remove all JSX that referenced `livePrice` state variable. The state declaration was removed but some JSX still referenced it.
### Fix
Read the full file and confirmed all HUD JSX was properly replaced in subsequent edit pass.

## Next.js 16: ssr: false not allowed in Server Components (2026-02-12)
### Symptom
Build error: `ssr: false is not allowed with next/dynamic in Server Components. Please move it into a Client Component.`
### Root Cause
Used `next/dynamic(() => import("@/components/wallet-provider"), { ssr: false })` in `layout.tsx` which is a Server Component.
### Fix
Remove `next/dynamic` entirely. Just import the `"use client"` component directly:
```tsx
import { WalletProviderWrapper } from "@/components/wallet-provider";
```
The `"use client"` directive in `wallet-provider.tsx` already creates the client boundary. Server Components CAN import Client Components — Next.js handles SSR/hydration automatically.
### Key Insight
`"use client"` does NOT mean "skip SSR" — it means "this is a Client Component" which still pre-renders on the server but hydrates on the client.

## Unicorn Studio: pointer-events:none not enough to disable mouse (2026-02-12)
### Symptom
Unicorn Studio 3D effect still reacted to cursor position even with `pointer-events: none` on the container div.
### Root Cause
Unicorn Studio script adds window-level mouse/touch event listeners (not element-level), so CSS `pointer-events: none` has no effect on the interaction.
### Fix
Use the official `data-us-disablemouse` attribute on the embed div:
```html
<div data-us-project="cqcLtDwfoHqqRPttBbQE" data-us-disablemouse />
```

## CSS hue-rotate: 35deg = green, not gold (2026-02-12)
### Symptom
Trying to shift Unicorn Studio effect from purple to gold using `hue-rotate(35deg)` resulted in a green tint instead.
### Root Cause
CSS hue-rotate operates on the HSL color wheel. Purple (270°) + 35° = ~305° which passes through green before reaching warm tones. The sepia+saturate base was already warm, so the 35deg pushed it past gold into green.
### Fix
Use `hue-rotate(5deg)` with `sepia(1) saturate(2)` — the sepia does most of the work, hue-rotate just fine-tunes.
### Key Insight
For gold-tinting: `sepia(1)` is the primary transform (converts any color to warm brown). `saturate(2)` intensifies. `hue-rotate` should be minimal (0-10deg max).

## Anchor 0.32 Error Translator Bug (2026-02-15)
### Symptoms
- All error-path tests fail with `Unknown action 'undefined'` instead of proper error codes
- Only happens with `new Program(IDL, provider)` using a non-default provider
- Default provider from `AnchorProvider.env()` works fine
- 14 out of 28 tests failed simultaneously after switching to SDK-based testing
### Root Cause
Anchor 0.32's `Program` constructor doesn't properly initialize the error translator for non-default providers. Transactions work correctly but error messages aren't parsed.
### Fix (SDK-level)
`parseError()` extracts `AnchorError` from `SendTransactionError.logs` using `AnchorError.parse(logs)`. All `.rpc()` calls wrapped in `sendTx()`.
### Fix (Test-level)
`expectRevert()` helper accepts both the real error keyword OR `"Unknown action"` as valid failure.
### Skill Created
`~/.claude/skills/brain-dump/extracted/anchor-032-error-translator-non-default-provider/SKILL.md`
`~/.claude/skills/brain-dump/extracted/anchor-sdk-error-parsing-wrapper/SKILL.md`

## Empty SDK package.json → Node.js Crash (2026-02-15)
### Symptom
`Error: Invalid package config /path/to/sdk/package.json` — Node.js crashes before any test runs.
### Root Cause
`sdk/package.json` was 0 bytes (empty file). Node.js module resolution crashes on empty JSON.
### Fix
Wrote minimal `{ "name": "token-lp-sdk", "version": "0.1.0", "main": "src/index.ts" }`.

## "Blockhash not found" with Custom Providers (2026-02-15)
### Symptom
Transactions fail intermittently with "Blockhash not found" using `new AnchorProvider(connection, wallet, opts)`.
### Root Cause
Custom provider opts didn't match the test validator's timing.
### Fix
Copy opts from the default provider + add `skipPreflight: true`:
```typescript
const opts = { ...provider.opts, skipPreflight: true, commitment: "confirmed", preflightCommitment: "confirmed" };
```

## referral_fee u128 vs u64 Mismatch (2026-02-15)
### Symptom
Build error: `referral_fee` is u128 but used in u64 lamport operations.
### Root Cause
`referral_fee` computed as u128 (from multiplication chain) but never cast down. The existing `let fee = u64::try_from(fee)` was a no-op (fee already u64).
### Fix
Replace with `let referral_fee = u64::try_from(referral_fee).map_err(|_| MathError::CastOverflow)?;` in buy.rs, sell.rs, create_and_buy.rs.
