use anchor_lang::prelude::*;

/// Compte de parrainage — un par referrer (wallet unique).
///
/// Quand quelqu'un partage son lien de ref (ex: launchpad.com/?ref=WALLET),
/// chaque trade fait via ce lien donne 10% des fees au referrer.
/// Ce compte track ses gains et le nombre de trades qu'il a référés.
///
/// PDA seeds: ["referral", referrer.key().as_ref()]
#[account]
#[derive(InitSpace)]
pub struct Referral {
    pub referrer: Pubkey,       // wallet du parrain
    pub total_earned: u64,      // total des fees gagnées (en lamports)
    pub trade_count: u64,       // nombre de trades référés
    pub bump: u8,
}