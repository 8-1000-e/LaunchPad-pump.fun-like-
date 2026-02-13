use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;

pub fn _register_referral(ctx: Context<RegisterReferral>) -> Result <()>
{
    ctx.accounts.referral.referrer = ctx.accounts.user.key();
    ctx.accounts.referral.total_earned = 0;
    ctx.accounts.referral.trade_count = 0;
    ctx.accounts.referral.bump = ctx.bumps.referral;
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterReferral<'info>
{
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + Referral::INIT_SPACE,
        seeds = [REFERRAL_SEED, user.key().as_ref()],
        bump
    )]
    pub referral: Account<'info, Referral>,
    pub system_program: Program<'info, System>
}
