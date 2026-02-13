use anchor_lang::prelude::*;
use crate::state::*;
use crate::constants::*;
use crate::errors::*;

pub fn _claim_referral_fees(ctx: Context<ClaimReferralFees>) -> Result<()>
{
    let rent = Rent::get()?.minimum_balance(8 + Referral::INIT_SPACE);
    let amount = ctx.accounts.referral.to_account_info().lamports()                      
        .checked_sub(rent)                                              
        .ok_or(AdminError::NotEnoughLamports)?; 

    ctx.accounts.referral.sub_lamports(amount)?;
    ctx.accounts.user.add_lamports(amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimReferralFees<'info>
{
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = referral.referrer == user.key(),
        seeds = [REFERRAL_SEED, user.key().as_ref()],
        bump
    )]
    pub referral: Account<'info, Referral>,
}