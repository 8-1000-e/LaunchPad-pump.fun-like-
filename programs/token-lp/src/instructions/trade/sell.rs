use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::errors::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;
use crate::utils::math::calculate_sell_amount;

pub fn _sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()>
{
    require!(token_amount > 0, TradeError::ZeroAmount);
    require!(ctx.accounts.global.status != ProgramStatus::Paused, TradeError::ProgramPaused);
    require!(ctx.accounts.bonding_curve.completed == false, TradeError::CurveCompleted);
    let sol_out = calculate_sell_amount(ctx.accounts.bonding_curve.virtual_sol, ctx.accounts.bonding_curve.virtual_token, token_amount)?;

    let fee = (sol_out as u128)
        .checked_mul(ctx.accounts.global.trade_fee_bps as u128)
        .ok_or(MathError::Overflow)?
        .checked_div(10_000)
        .ok_or(MathError::DivisionByZero)? as u64;

    let sol_after_fee = sol_out - fee;


    require!(sol_out >= min_sol_out, TradeError::SlippageExceeded);
    require!(sol_out <= ctx.accounts.bonding_curve.real_sol_reserves, TradeError::NotEnoughTokens);
    //send sol to seller
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Transfer{
            authority: ctx.accounts.seller.to_account_info(),
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
        }
    );

    anchor_spl::token::transfer(cpi_context, token_amount)?;

    //send token from seller to bonding curve
    let signer_seeds: &[&[u8]] = &[
    BONDING_CURVE_SEED,
    ctx.accounts.mint.to_account_info().key.as_ref(),
    &[ctx.accounts.bonding_curve.bump],
    ];
    let binding = [signer_seeds];
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer{
            from:   ctx.accounts.bonding_curve.to_account_info(),
            to: ctx.accounts.seller.to_account_info(),
        },
        &binding
    );

    anchor_lang::system_program::transfer(cpi_context, sol_after_fee)?;

    //fees
    if let Some(referral) = &mut ctx.accounts.referral
    {
        let referral_fee = (fee as u128)
            .checked_mul(ctx.accounts.global.referral_share_bps as u128)
            .ok_or(MathError::Overflow)?
            .checked_div(10_000)
            .ok_or(MathError::DivisionByZero)? as u64;

        let protocol_fee = fee - referral_fee;

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer{
                from: ctx.accounts.bonding_curve.to_account_info(),
                to: ctx.accounts.fee_vault.to_account_info(),
            },
            &binding
        );

        anchor_lang::system_program::transfer(cpi_context, protocol_fee)?;

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer{
                from: ctx.accounts.bonding_curve.to_account_info(),
                to: referral.to_account_info(),
            },
            &binding
        );

        anchor_lang::system_program::transfer(cpi_context, referral_fee)?;

        referral.total_earned += referral_fee;
        referral.trade_count += 1;
    } 
    else 
    { 
        let cpi_context = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer{
                    from: ctx.accounts.bonding_curve.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                },
                &binding
            );

        anchor_lang::system_program::transfer(cpi_context, fee)?;
    }

    ctx.accounts.bonding_curve.virtual_sol -= sol_out;
    ctx.accounts.bonding_curve.virtual_token += token_amount;
    ctx.accounts.bonding_curve.real_sol_reserves -= sol_out;
    ctx.accounts.bonding_curve.real_token += token_amount;

    if ctx.accounts.bonding_curve.real_sol_reserves >= ctx.accounts.global.graduation_threshold
    {
      ctx.accounts.bonding_curve.completed = true;
    }
    Ok(())
}

#[derive(Accounts)]
pub struct Sell<'info>
{
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global: Account<'info, Global>,

    #[account()]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [FEE_VAULT_SEED],
        bump,        
    )]
    pub fee_vault: SystemAccount<'info>,
  
    #[account(mut)]
    pub referral: Option<Account<'info, Referral>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}