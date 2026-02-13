use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod instructions;
pub mod utils;

use instructions::*;
use state::*;

declare_id!("HY3g1uQL2Zki1aFVJvJYZnMjZNveuMJhU22f9BucN3X");

#[program]
pub mod token_lp {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> 
    {
        instructions::admin::initialize::_initialize(ctx)
    }

    pub fn update_config(ctx: Context<UpdateConfig>, 
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
        instructions::admin::update_config::_update_config(ctx, new_fee_receiver, new_initial_virtual_sol_reserves, new_initial_virtual_token_reserves, new_initial_real_token_reserves, new_token_total_supply, new_trade_fee_bps, new_creator_share_bps, new_referral_share_bps, new_graduation_threshold, new_status)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()>
    {
        instructions::admin::withdraw_fees::_withdraw_fees(ctx)
    }

    pub fn create_token(ctx: Context<CreateToken>, name: String, symbol: String, uri: String) -> Result<()>
    {
        instructions::launch::create_token::_create_token(ctx, name, symbol, uri)
    }

    pub fn create_and_buy_token(ctx: Context<CreateAndBuyToken>, name: String, symbol: String, uri: String, sol_amount: u64) -> Result<()>
    {
        instructions::launch::create_and_buy::_create_and_buy_token(ctx, name, symbol, uri, sol_amount)
    }

    pub fn buy_token(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()>
    {
        instructions::trade::buy::_buy(ctx, sol_amount, min_tokens_out)
    }

    pub fn sell_token(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()>
    {
        instructions::trade::sell::_sell(ctx, token_amount, min_sol_out)
    }  

    pub fn register_referral(ctx: Context<RegisterReferral>) -> Result<()>
    {
        instructions::referral::register_referral::_register_referral(ctx)
    }

    pub fn claim_referral_fees(ctx: Context<ClaimReferralFees>) -> Result<()>
    {
        instructions::referral::claim_fees::_claim_referral_fees(ctx)
    }

    pub fn migrate_to_raydium(ctx: Context<MigrateRaydium>) -> Result<()>
    {
        instructions::migration::migrate_to_raydium::_migrate_to_raydium(ctx)
    }
}
