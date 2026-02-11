use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;


pub fn handler(ctx: Context<Initialize>) -> Result<()>
{
    ctx.accounts.global.authority = ctx.accounts.authority.key();
    ctx.accounts.global.fee_receiver = ctx.accounts.authority.key();
    ctx.accounts.global.initial_virtual_sol_reserves = DEFAULT_VIRTUAL_SOL;
    ctx.accounts.global.initial_virtual_token_reserves = DEFAULT_VIRTUAL_TOKENS;
    ctx.accounts.global.initial_real_token_reserves = DEFAULT_REAL_TOKENS;
    ctx.accounts.global.token_total_supply = DEFAULT_TOKEN_SUPPLY;
    ctx.accounts.global.token_decimal = DEFAULT_DECIMALS;
    ctx.accounts.global.trade_fee_bps = DEFAULT_TRADE_FEE_BPS;
    ctx.accounts.global.creator_share_bps = DEFAULT_CREATOR_SHARE_BPS;
    ctx.accounts.global.referral_share_bps = DEFAULT_REFERRAL_SHARE_BPS;
    ctx.accounts.global.graduation_threshold = DEFAULT_GRADUATION_THRESHOLD;
    ctx.accounts.global.status = ProgramStatus::Running;
    ctx.accounts.global.bump = ctx.bumps.global;

    Ok(())
}


#[derive(Accounts)]
pub struct Initialize<'info>
{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Global::INIT_SPACE,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        seeds = [FEE_VAULT_SEED],
        bump
    )]
    pub fee_vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
