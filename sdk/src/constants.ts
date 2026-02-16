import { BN } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js";


export const PROGRAM_ID = new PublicKey("GzXpRdSJRrd9qqbigtawUFAqjf39inX5Zju7sZDSpdJx");

//SEEDS

// PDA Seeds
export const GLOBAL_SEED = "global";
export const BONDING_CURVE_SEED = "bonding-curve";
export const FEE_VAULT_SEED = "fee-vault";
export const REFERRAL_SEED = "referral";

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
//  Unit Helpers
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_DECIMALS = 6;
export const TOKEN_DECIMALS_FACTOR = 1_000_000; // 10^6

// Bonding Curve Defaults
export const DEFAULT_VIRTUAL_SOL = new BN("30000000000");
export const DEFAULT_VIRTUAL_TOKENS = new BN("1073000000000000");
export const DEFAULT_REAL_TOKENS = new BN("793100000000000");
export const DEFAULT_TOKEN_SUPPLY = new BN("1000000000000000");

// Fee Config (basis points, 10_000 = 100%) 
export const DEFAULT_TRADE_FEE_BPS = 100;        // 1%
export const DEFAULT_CREATOR_SHARE_BPS = 6_500;   // 65% de la fee
export const DEFAULT_REFERRAL_SHARE_BPS = 1_000;   // 10% de la fee

// Graduation 
export const DEFAULT_GRADUATION_THRESHOLD = new BN("85000000000");
export const MIGRATION_FEE = new BN("500000000");
