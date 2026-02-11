// PDA Seeds 
pub const GLOBAL_SEED: &[u8] = b"global";
pub const BONDING_CURVE_SEED: &[u8] = b"bonding-curve";
pub const FEE_VAULT_SEED: &[u8] = b"fee-vault";
pub const REFERRAL_SEED: &[u8] = b"referral";

//  Unit Helpers
pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
pub const DEFAULT_DECIMALS: u8 = 6;
pub const TOKEN_DECIMALS_FACTOR: u64 = 1_000_000; // 10^6

// Bonding Curve Defaults
pub const DEFAULT_VIRTUAL_SOL: u64 = 30 * LAMPORTS_PER_SOL;
pub const DEFAULT_VIRTUAL_TOKENS: u64 = 1_073_000_000 * TOKEN_DECIMALS_FACTOR;
pub const DEFAULT_REAL_TOKENS: u64 = 793_100_000 * TOKEN_DECIMALS_FACTOR;
pub const DEFAULT_TOKEN_SUPPLY: u64 = 1_000_000_000 * TOKEN_DECIMALS_FACTOR;

// Fee Config (basis points, 10_000 = 100%) 
pub const DEFAULT_TRADE_FEE_BPS: u16 = 100;        // 1%
pub const DEFAULT_CREATOR_SHARE_BPS: u16 = 3_000;   // 30% de la fee
pub const DEFAULT_REFERRAL_SHARE_BPS: u16 = 1_000;   // 10% de la fee

// Graduation 
pub const DEFAULT_GRADUATION_THRESHOLD: u64 = 85 * LAMPORTS_PER_SOL;
pub const MIGRATION_FEE: u64 = LAMPORTS_PER_SOL / 2;
