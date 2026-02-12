use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3,
    CreateMetadataAccountsV3,
    Metadata,
    mpl_token_metadata::types::DataV2,
};

#[derive(Accounts)]
pub struct CreateAndBuyToken<'info>
{
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_SEED],
        bump,
    )]
    pub global: Account<'info, Global>,

    #[account(
    init,
    payer = creator,
    mint::decimals = global.token_decimal,
    mint::authority = bonding_curve,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [BONDING_CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

        

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [FEE_VAULT_SEED],
        bump,        
    )]
    pub fee_vault: SystemAccount<'info>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: created via CPI to token metadata program
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}