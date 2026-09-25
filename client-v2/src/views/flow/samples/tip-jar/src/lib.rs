use anchor_lang::prelude::*;
use anchor_lang::system_program;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");

/// A tip jar for creators.
///
/// Each creator's jar is a PDA seeded with their wallet. Anyone can put SOL
/// in; only the creator can take it out.
#[program]
mod tip_jar {
    use super::*;

    /// Open a tip jar for the calling wallet.
    pub fn create_jar(ctx: Context<CreateJar>) -> Result<()> {
        ctx.accounts.jar.creator = ctx.accounts.creator.key();
        Ok(())
    }

    /// Send `lamports` from the caller into a creator's jar.
    pub fn tip(ctx: Context<Tip>, lamports: u64) -> Result<()> {
        require!(lamports > 0, TipJarError::EmptyTip);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.tipper.to_account_info(),
                    to: ctx.accounts.jar.to_account_info(),
                },
            ),
            lamports,
        )?;

        let jar = &mut ctx.accounts.jar;
        jar.total_tips = jar.total_tips.checked_add(lamports).unwrap();
        msg!("Tipped {} lamports", lamports);
        Ok(())
    }

    /// Move everything above the jar's rent-exempt minimum to the creator.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let jar = ctx.accounts.jar.to_account_info();
        let creator = ctx.accounts.creator.to_account_info();

        // The jar keeps what it needs to stay open
        let reserve = Rent::get()?.minimum_balance(jar.data_len());
        let amount = jar.lamports().saturating_sub(reserve);
        require!(amount > 0, TipJarError::NothingToWithdraw);

        // The jar is owned by this program, so it can move the lamports directly
        **jar.try_borrow_mut_lamports()? -= amount;
        **creator.try_borrow_mut_lamports()? += amount;

        msg!("Withdrew {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateJar<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + TipJar::INIT_SPACE,
        seeds = [b"jar", creator.key().as_ref()],
        bump
    )]
    pub jar: Account<'info, TipJar>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    #[account(mut)]
    pub jar: Account<'info, TipJar>,
    #[account(mut)]
    pub tipper: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    // `has_one` checks that the jar's creator is the signer
    #[account(mut, has_one = creator)]
    pub jar: Account<'info, TipJar>,
    #[account(mut)]
    pub creator: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct TipJar {
    /// The only wallet that can withdraw
    pub creator: Pubkey,
    /// Lamports tipped over the jar's lifetime
    pub total_tips: u64,
}

#[error_code]
pub enum TipJarError {
    #[msg("A tip has to be more than zero")]
    EmptyTip,
    #[msg("There is nothing to withdraw")]
    NothingToWithdraw,
}
