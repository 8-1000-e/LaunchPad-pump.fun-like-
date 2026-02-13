use anchor_lang::prelude::*;
use crate::errors::*;

/// Calcule combien de tokens on reçoit pour `sol_amount` SOL                
/// Formule constant-product : tokens_out = (virtual_token * sol_amount) / (virtual_sol + sol_amount)
pub fn calculate_buy_amount(virtual_sol: u64, virtual_token: u64, sol_amount: u64) -> Result<u64>
{
    let numerator = (virtual_token as u128).checked_mul(sol_amount as u128)
    .ok_or(MathError::Overflow)?;

    let denominator = (virtual_sol as u128).checked_add(sol_amount as u128)
    .ok_or(MathError::Overflow)?;

    let tokens_out = numerator.checked_div(denominator)
    .ok_or(MathError::DivisionByZero)?;

    Ok(tokens_out as u64)
}

pub fn calculate_sell_amount(virtual_sol: u64, virtual_token: u64, token_amount: u64) -> Result<u64>
{
    let numerator = (virtual_sol as u128).checked_mul(token_amount as u128)
    .ok_or(MathError::Overflow)?;

    let denominator = (virtual_token as u128).checked_add(token_amount as u128)
    .ok_or(MathError::Overflow)?;

    let sol_out = numerator.checked_div(denominator)
    .ok_or(MathError::DivisionByZero)?;

    Ok(sol_out as u64)
}