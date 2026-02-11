use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BondingCurve
{
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol: u64,
    pub virtual_token: u64,
    pub real_token: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub start_time: i64,
    pub completed: bool,
    pub migrated: bool,
    pub bump: u8,
}