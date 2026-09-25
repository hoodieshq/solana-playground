use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");

/// A counter for every wallet.
///
/// Each counter lives at a program derived address (PDA) seeded with its
/// wallet's public key, so a wallet always finds the same counter and only
/// that wallet can create or increment it.
#[program]
mod counter {
    use super::*;

    /// Create the caller's counter, starting at zero.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.bump = ctx.bumps.counter;
        msg!("Counter created at {}", counter.key());
        Ok(())
    }

    /// Add one to the caller's counter.
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_add(1).unwrap();
        msg!("Count is now {}", counter.count);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    // 8 bytes of account discriminator, then the fields of `Counter`
    #[account(
        init,
        payer = authority,
        space = 8 + Counter::INIT_SPACE,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    // The same seeds, so this can only ever be the signer's own counter
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    /// How many times the counter has been incremented
    pub count: u64,
    /// Stored so later instructions can verify the address without searching
    pub bump: u8,
}
