use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::errors::*;
use anchor_spl::token::{Mint, TokenAccount, Token};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3,
    CreateMetadataAccountsV3,
    Metadata,
    mpl_token_metadata::types::DataV2,
};

pub fn _create_token(ctx: Context<CreateToken>, name: String, symbol: String, uri: String) -> Result<()>
{
    require!(ctx.accounts.global.status != ProgramStatus::Paused, AdminError::ProgramPaused);

    let bc = &mut ctx.accounts.bonding_curve;                                    
    bc.mint = ctx.accounts.mint.key();                                           
    bc.creator = ctx.accounts.creator.key();                                     
    bc.virtual_sol = ctx.accounts.global.initial_virtual_sol_reserves;           
    bc.virtual_token = ctx.accounts.global.initial_virtual_token_reserves;       
    bc.real_token = ctx.accounts.global.initial_real_token_reserves;
    bc.real_sol_reserves = 0;
    bc.token_total_supply = ctx.accounts.global.token_total_supply;
    bc.start_time = Clock::get()?.unix_timestamp;
    bc.completed = false;
    bc.migrated = false;
    bc.bump = ctx.bumps.bonding_curve;

    let mint_key = ctx.accounts.mint.key();                                      
    let seeds = &[                                                               
        BONDING_CURVE_SEED,
        mint_key.as_ref(),
        &[bc.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    anchor_spl::token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.global.token_total_supply,
    )?;

    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.bonding_curve.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                update_authority: ctx.accounts.bonding_curve.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        ),
        DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false, // is_mutable
        true,  // update_authority_is_signer
        None,  // collection_details
    )?;

    Ok(())
}


#[derive(Accounts)]
pub struct CreateToken<'info>
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
