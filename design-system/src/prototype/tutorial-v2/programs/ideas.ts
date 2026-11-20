import type { Ix } from "./data"

/* What Home's "Build your own" can turn into code while the assistant is made up: three small Anchor
   programs, each with the one question worth asking before writing it, and the code for either answer.
   A request is read by its words: one of these, a build request too vague to start ("something cool"),
   or nothing that says what to build (Almaz, 20 Nov: random text made a project with the starter in it
   and an assistant talking about Build) */

export type IdeaId = "counter" | "tip-jar" | "vote"

export type Idea = {
  id: IdeaId
  /** The chip that picks it, for a request that named nothing */
  label: string
  /** What the assistant says it will write, before the question */
  plan: string
  question: string
  /** The two answers; the first is the default when you write it without answering */
  options: [string, string]
  /** A detail the request may carry that the code can keep, as "each wallet votes once": its words, and
   * what the assistant says back when it hears it */
  extra?: { test: RegExp; heard: string }
  write: (option: 0 | 1, extra: boolean) => { files: Record<string, string>; ixs: Ix[]; said: string }
}

const HEAD = `use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");
`

const counter: Idea = {
  id: "counter",
  label: "A counter",
  plan: "A counter: `initialize` makes an account that holds a number, `increment` adds one to it.",
  question: "Can anyone add one, or only the wallet that made it?",
  options: ["Anyone", "Only the owner"],
  write: (o) => {
    const signer = o === 1 ? "authority" : "user"
    const lib = `${HEAD}
#[program]
mod counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        counter.authority = ctx.accounts.user.key();
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        msg!("Count is now {}", counter.count);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8 + 32)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut${o === 1 ? ", has_one = authority" : ""})]
    pub counter: Account<'info, Counter>,
    pub ${signer}: Signer<'info>,
}

#[account]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}
`
    return {
      files: { "src/lib.rs": lib },
      ixs: [
        { name: "initialize", args: [], accounts: ["counter", "user", "system_program"], line: "Makes the counter account at 0." },
        { name: "increment", args: [], accounts: ["counter", signer], line: o === 1 ? "Adds one. Only the wallet that made it can." : "Adds one. Any wallet can." },
      ],
      said: o === 1 ? "`increment` checks `has_one = authority`, so only the wallet that made the counter can add to it." : "`increment` takes any signer, so any wallet can add one.",
    }
  },
}

const tipJar: Idea = {
  id: "tip-jar",
  label: "A tip jar",
  plan: "A tip jar for two wallets: `initialize` saves who they are, `tip` takes SOL and pays both.",
  question: "Split every tip 50/50, or let the tipper set the share?",
  options: ["50/50", "Tipper sets it"],
  write: (o) => {
    const share = o === 1 ? "share as u64" : "50"
    const lib = `${HEAD}
#[program]
mod tip_jar {
    use super::*;
    use anchor_lang::system_program::{transfer, Transfer};

    pub fn initialize(ctx: Context<Initialize>, first: Pubkey, second: Pubkey) -> Result<()> {
        let jar = &mut ctx.accounts.jar;
        jar.first = first;
        jar.second = second;
        Ok(())
    }

    pub fn tip(ctx: Context<Tip>, amount: u64${o === 1 ? ", share: u8" : ""}) -> Result<()> {${o === 1 ? `
        require!(share <= 100, TipError::ShareTooHigh);` : ""}
        let to_first = amount * ${share} / 100;
        let system = ctx.accounts.system_program.to_account_info();
        let from = ctx.accounts.tipper.to_account_info();
        transfer(CpiContext::new(system.clone(), Transfer { from: from.clone(), to: ctx.accounts.first.to_account_info() }), to_first)?;
        transfer(CpiContext::new(system, Transfer { from, to: ctx.accounts.second.to_account_info() }), amount - to_first)?;
        msg!("Tipped {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32 + 32)]
    pub jar: Account<'info, Jar>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    #[account(has_one = first, has_one = second)]
    pub jar: Account<'info, Jar>,
    /// CHECK: the jar says who gets paid
    #[account(mut)]
    pub first: UncheckedAccount<'info>,
    /// CHECK: the jar says who gets paid
    #[account(mut)]
    pub second: UncheckedAccount<'info>,
    #[account(mut)]
    pub tipper: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Jar {
    pub first: Pubkey,
    pub second: Pubkey,
}
${o === 1 ? `
#[error_code]
pub enum TipError {
    #[msg("The share is a percent, 100 at most")]
    ShareTooHigh,
}
` : ""}`
    return {
      files: { "src/lib.rs": lib },
      ixs: [
        { name: "initialize", args: [{ name: "first", type: "pubkey", example: "7xKX…gAsU" }, { name: "second", type: "pubkey", example: "9aQe…3mZp" }], accounts: ["jar", "user", "system_program"], line: "Saves the two wallets that share the tips." },
        { name: "tip", args: [{ name: "amount", type: "u64", example: "10000000" }, ...(o === 1 ? [{ name: "share", type: "u8", example: "70" }] : [])], accounts: ["jar", "first", "second", "tipper", "system_program"], line: o === 1 ? "Sends SOL; `share` percent goes to the first wallet." : "Sends SOL, half to each wallet." },
      ],
      said: o === 1 ? "`tip` takes `share` as a percent for the first wallet and stops anything over 100." : "`tip` sends half to each wallet; an odd lamport goes to the second.",
    }
  },
}

const vote: Idea = {
  id: "vote",
  label: "A vote",
  plan: "A vote: `create_poll` opens a question, `vote` counts one answer.",
  question: "Yes or no, or up to four options?",
  options: ["Yes or no", "Up to four options"],
  extra: { test: /\bonce\b|\btwice\b|one vote|single vote|only one/i, heard: "One vote per wallet too." },
  write: (o, once) => {
    // Once per wallet: each vote makes an empty account at the poll's and the wallet's address, so a second one fails
    const voter = once
      ? `    #[account(init, payer = voter, space = 8, seeds = [b"voted", poll.key().as_ref(), voter.key().as_ref()], bump)]
    pub voted: Account<'info, Voted>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,`
      : `    pub voter: Signer<'info>,`
    const voted = once ? `\n#[account]\npub struct Voted {}\n` : ""
    const lib =
      o === 0
        ? `${HEAD}
#[program]
mod vote {
    use super::*;

    pub fn create_poll(ctx: Context<CreatePoll>, question: String) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        poll.question = question;
        poll.yes = 0;
        poll.no = 0;
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, yes: bool) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        if yes { poll.yes += 1 } else { poll.no += 1 }
        msg!("Yes {}, no {}", poll.yes, poll.no);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(init, payer = user, space = 8 + 4 + 200 + 8 + 8)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
${voter}
}

#[account]
pub struct Poll {
    pub question: String,
    pub yes: u64,
    pub no: u64,
}
${voted}`
        : `${HEAD}
#[program]
mod vote {
    use super::*;

    pub fn create_poll(ctx: Context<CreatePoll>, question: String, options: u8) -> Result<()> {
        require!(options >= 2 && options <= 4, VoteError::Options);
        let poll = &mut ctx.accounts.poll;
        poll.question = question;
        poll.options = options;
        poll.counts = [0; 4];
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, choice: u8) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        require!(choice < poll.options, VoteError::Choice);
        poll.counts[choice as usize] += 1;
        msg!("Option {} has {} votes", choice, poll.counts[choice as usize]);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreatePoll<'info> {
    #[account(init, payer = user, space = 8 + 4 + 200 + 1 + 8 * 4)]
    pub poll: Account<'info, Poll>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,
${voter}
}

#[account]
pub struct Poll {
    pub question: String,
    pub options: u8,
    pub counts: [u64; 4],
}
${voted}
#[error_code]
pub enum VoteError {
    #[msg("A poll has 2 to 4 options")]
    Options,
    #[msg("No such option")]
    Choice,
}
`
    return {
      files: { "src/lib.rs": lib },
      ixs:
        o === 0
          ? [
              { name: "create_poll", args: [{ name: "question", type: "string", example: "Ship on Friday?" }], accounts: ["poll", "user", "system_program"], line: "Opens a yes or no question." },
              { name: "vote", args: [{ name: "yes", type: "bool", example: "true" }], accounts: once ? ["poll", "voted", "voter", "system_program"] : ["poll", "voter"], line: "Counts one yes or one no." },
            ]
          : [
              { name: "create_poll", args: [{ name: "question", type: "string", example: "Where to next?" }, { name: "options", type: "u8", example: "3" }], accounts: ["poll", "user", "system_program"], line: "Opens a question with 2 to 4 options." },
              { name: "vote", args: [{ name: "choice", type: "u8", example: "0" }], accounts: once ? ["poll", "voted", "voter", "system_program"] : ["poll", "voter"], line: "Counts one vote for an option, from 0." },
            ],
      said: `${o === 0 ? "`vote` takes `yes` as true or false." : "`create_poll` takes 2 to 4 options and `vote` checks the choice."} ${once ? "Each vote makes a small `voted` account for that wallet, so its second vote fails." : "Nothing stops a wallet voting twice yet: ask me if you want that."}`,
    }
  },
}

export const IDEAS: Record<IdeaId, Idea> = { counter, "tip-jar": tipJar, vote }
export const IDEA_CHIPS = Object.values(IDEAS).map((i) => i.label)

export const WRITE_IT = "Write it"
export const STARTER_ASK = "Start from the Anchor starter"

/** The idea a message names, by its words */
export function ideaIn(text: string): IdeaId | null {
  const t = text.toLowerCase()
  if (/\bcount(er|ing)?\b|\bclicks?\b|\btall(y|ies)\b/.test(t)) return "counter"
  if (/\btips?\b|\bdonat|\bsplit/.test(t)) return "tip-jar"
  if (/\bvot(e|es|ing)\b|\bpoll\b|\bballot\b|\belection\b/.test(t)) return "vote"
  return null
}

/** A request to build that doesn't say what: worth one question, not a shrug */
export function vagueBuild(text: string): boolean {
  return /\b(build|make|create|write|code|program|app|dapp|game|something|anything|idea|project|contract|token|nft|defi|cool|help)\b/i.test(text)
}

const SKIP = new Set(["or", "it", "to", "the", "up", "a", "an"])

/** The answer a message already gives to an idea's question: every word of the option, by its first three
 * letters ("yes and no" answers "Yes or no", "let the tipper set it" answers "Tipper sets it") */
export function optionIn(idea: Idea, text: string): 0 | 1 | null {
  const words = text.toLowerCase().split(/[^a-z0-9/]+/).filter(Boolean)
  const has = (w: string) => words.some((x) => x.startsWith(w.slice(0, 3)))
  const at = idea.options.findIndex((o) => {
    const need = o.toLowerCase().split(/[^a-z0-9/]+/).filter((w) => w && !SKIP.has(w))
    return need.length > 0 && need.every(has)
  })
  return at === -1 ? null : (at as 0 | 1)
}
