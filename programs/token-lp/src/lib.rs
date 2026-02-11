use anchor_lang::prelude::*;

declare_id!("HY3g1uQL2Zki1aFVJvJYZnMjZNveuMJhU22f9BucN3X");

#[program]
pub mod token_lp {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
