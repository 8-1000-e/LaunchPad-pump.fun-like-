use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::errors::*;

pub fn _withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()>
{
    let rent = Rent::get()?.minimum_balance(0);
    let amount = ctx.accounts.fee_vault.lamports()                      
        .checked_sub(rent)                                              
        .ok_or(AdminError::NotEnoughLamports)?; 

    ctx.accounts.fee_vault.sub_lamports(amount)?;
    ctx.accounts.recipient.add_lamports(amount)?;
    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawFees<'info>
{
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global: Account<'info, Global>,

    #[account(
        mut,
        seeds = [FEE_VAULT_SEED],
        bump
    )]
    pub fee_vault: SystemAccount<'info>,
    
    /// CHECK: just receives lamports
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
}