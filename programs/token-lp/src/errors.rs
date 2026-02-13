use anchor_lang::prelude::*;

#[error_code]
pub enum AdminError
{
    #[msg("Not enough lamports to withdraw fees!")]
    NotEnoughLamports,
    #[msg("Program is paused!")]
    ProgramPaused,
}

#[error_code]
pub enum MathError
{
    #[msg("Math overflow")]
    Overflow,
    #[msg("Division by zero")]
    DivisionByZero,
}

#[error_code]
pub enum TradeError 
{
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Bonding curve already completed")]
    CurveCompleted,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Program Paused !")]
    ProgramPaused,
    #[msg("Not Enough tokens available !")]
    NotEnoughTokens,
}