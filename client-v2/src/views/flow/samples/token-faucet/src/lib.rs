use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount},
};

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");

/// Decimals of the faucet's token
pub const DECIMALS: u8 = 6;

/// The most a single request can mint: 100 whole tokens
pub const MAX_PER_REQUEST: u64 = 100 * 10u64.pow(DECIMALS as u32);

/// A faucet for a test token.
///
/// The mint lives at a PDA and is its own mint authority, so the only way to
/// create new tokens is through this program, which caps every request.
#[program]
mod token_faucet {
    use super::*;

    /// Create the faucet's mint. Runs once, since its address is fixed.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Faucet mint: {}", ctx.accounts.mint.key());
        Ok(())
    }

    /// Mint `amount` base units to the caller, creating their token account
    /// on their first request.
    pub fn request_tokens(ctx: Context<RequestTokens>, amount: u64) -> Result<()> {
        require!(amount > 0, FaucetError::ZeroAmount);
        require!(amount <= MAX_PER_REQUEST, FaucetError::OverLimit);

        // The mint is its own authority, so it signs with its own seeds
        let signer_seeds: &[&[&[u8]]] = &[&[b"mint", &[ctx.bumps.mint]]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        msg!("Minted {} base units", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"mint"],
        bump,
        mint::decimals = DECIMALS,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestTokens<'info> {
    #[account(mut, seeds = [b"mint"], bump)]
    pub mint: Account<'info, Mint>,
    // The requester's associated token account, created on first use
    #[account(
        init_if_needed,
        payer = requester,
        associated_token::mint = mint,
        associated_token::authority = requester,
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub requester: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum FaucetError {
    #[msg("Ask for at least one base unit")]
    ZeroAmount,
    #[msg("That is more than one request can mint")]
    OverLimit,
}
