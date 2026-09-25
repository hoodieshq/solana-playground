use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");

/// Polls where every wallet gets one vote.
///
/// Voting creates a receipt at a PDA seeded with the poll and the voter. An
/// account can only be created once, so a wallet's second vote on the same
/// poll fails before any of this program's code runs.
#[program]
mod voting {
    use super::*;

    /// Open a poll with two to four options.
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        question: String,
        options: Vec<String>,
    ) -> Result<()> {
        require!(
            (2..=4).contains(&options.len()),
            VotingError::WrongOptionCount
        );
        require!(
            question.len() <= 64 && options.iter().all(|option| option.len() <= 32),
            VotingError::TextTooLong
        );

        let poll = &mut ctx.accounts.poll;
        poll.creator = ctx.accounts.creator.key();
        poll.question = question;
        poll.votes = vec![0; options.len()];
        poll.options = options;
        Ok(())
    }

    /// Cast the caller's one vote, for the option at index `choice`.
    pub fn cast_vote(ctx: Context<CastVote>, choice: u8) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let tally = poll
            .votes
            .get_mut(choice as usize)
            .ok_or(VotingError::NoSuchOption)?;
        *tally += 1;

        ctx.accounts.receipt.choice = choice;
        msg!("Voted for \"{}\"", poll.options[choice as usize]);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(init, payer = creator, space = 8 + Poll::INIT_SPACE)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
    // One receipt per poll and voter: creating it a second time fails
    #[account(
        init,
        payer = voter,
        space = 8 + VoteReceipt::INIT_SPACE,
        seeds = [b"receipt", poll.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub receipt: Account<'info, VoteReceipt>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Poll {
    pub creator: Pubkey,
    #[max_len(64)]
    pub question: String,
    #[max_len(4, 32)]
    pub options: Vec<String>,
    /// Votes for each option, in the same order as `options`
    #[max_len(4)]
    pub votes: Vec<u64>,
}

#[account]
#[derive(InitSpace)]
pub struct VoteReceipt {
    /// Which option this wallet voted for
    pub choice: u8,
}

#[error_code]
pub enum VotingError {
    #[msg("A poll needs two to four options")]
    WrongOptionCount,
    #[msg("Questions can be 64 bytes long and options 32")]
    TextTooLong,
    #[msg("There is no option at that index")]
    NoSuchOption,
}
