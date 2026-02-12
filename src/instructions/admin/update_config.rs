use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

pub fn _update_config(ctx: Context<UpdateConfig>, 
    new_fee_receiver: Option<Pubkey>,
    new_initial_virtual_sol_reserves: Option<u64>,
    new_initial_virtual_token_reserves: Option<u64>,
    new_initial_real_token_reserves: Option<u64>,
    new_token_total_supply: Option<u64>,
    new_trade_fee_bps: Option<u16>,
    new_creator_share_bps: Option<u16>,
    new_referral_share_bps: Option<u16>,
    new_graduation_threshold: Option<u64>,
    new_status: Option<ProgramStatus>,
    ) -> Result<()>
{
    if let Some(val) = new_fee_receiver
    {
        ctx.accounts.global.fee_receiver = val;
    }

    if let Some(val) = new_initial_virtual_sol_reserves
    {
            ctx.accounts.global.initial_virtual_sol_reserves = val;
    }

    if let Some(val) = new_initial_virtual_token_reserves
    {
            ctx.accounts.global.initial_virtual_token_reserves = val;
    }

    if let Some(val) = new_initial_real_token_reserves
    {
            ctx.accounts.global.initial_real_token_reserves = val;
    }

    if let Some(val) = new_token_total_supply
    {
            ctx.accounts.global.token_total_supply = val;
    }

    if let Some(val) = new_trade_fee_bps
    {
            ctx.accounts.global.trade_fee_bps = val;
    }

    if let Some(val) = new_creator_share_bps
    {
            ctx.accounts.global.creator_share_bps = val;
    }

    if let Some(val) = new_referral_share_bps
    {
            ctx.accounts.global.referral_share_bps = val;
    }

    if let Some(val) = new_graduation_threshold
    {
            ctx.accounts.global.graduation_threshold = val;
    }

    if let Some(val) = new_status
    {
            ctx.accounts.global.status = val;
    }
    Ok(())
}


#[derive(Accounts)]
pub struct UpdateConfig<'info>
{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
    mut,
    has_one = authority,
    seeds = [GLOBAL_SEED],
    bump
    )]
    pub global: Account<'info, Global>,
}
