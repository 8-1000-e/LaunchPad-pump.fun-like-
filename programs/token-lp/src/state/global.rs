use anchor_lang::prelude::*;


#[account]
#[derive(InitSpace)]
pub struct Global
{
    pub authority: Pubkey, //who can modifie config
    pub fee_receiver: Pubkey,
    pub initial_virtual_sol_reserves: u64,
    pub initial_virtual_token_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub token_total_supply: u64,
    pub token_decimal: u8,
    pub trade_fee_bps: u16,
    pub creator_share_bps: u16,
    pub referral_share_bps: u16,
    pub graduation_threshold: u64,
    pub status: ProgramStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ProgramStatus
{
    Running,
    SwapOnly,
    Paused,
}