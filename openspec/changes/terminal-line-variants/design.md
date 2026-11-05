# Design

## Context

Failures reach the terminal through `PgTerm.process`, which prints
`processErrorLine(e)`. The message stays plain because button toasts and the
assistant read it. xterm maps the ANSI bright colours to the design system's
`--error`, `--warning`, `--info` and `--success` (`terminal-theme.ts`), so an
ANSI code is the variant.

HOO-2581 (#313, in `scope/interface`) added `LineTone`, `toneWith`, `lineTone`
and `TonedLineError` to `line-error.ts`. This change's base, `scope/interface-2`,
was cut before it and does not have them.

## Goals / Non-Goals

**Goals:** one place decides a thrown line's variant; the message stays plain.

**Non-Goals:** rendering terminal lines with the DS React component; xterm stays.

## Decisions

- **A thrown line's variant follows from what was thrown.** A stop is `warning`,
  anything else is `error`. No per-tone class: every thrown line that is not a
  stop is a refusal or a failure, so a subclass would only restate the default.
- **"Stopped." is `warning`, not `error`.** The person asked for it and nothing
  failed (`StoppedError`'s own contract); `success` would claim the work is done.
- **"can't be stopped" is `warning`.** The stop was refused but the run goes on
  and nothing failed. The `^C` echo stays plain: it is the person's own key.
- **Wallet declined is `error`.** The command ended without running, and the
  buttons already report it as a failure.
- **Same names as #313.** `LineTone`, `toneWith` and `lineTone` are kept so the
  two meet in one small conflict when `scope/interface` reaches this branch's
  base. Resolution: `lineTone` checks a stop, then `TonedLineError`'s tone, then
  answers `error`. #313's test "gives any other failure no tone" goes.

## Risks / Trade-offs

- A thrown message carrying its own ANSI reset ends the colour early, so the two
  deploy messages that embedded `PgTerminal.bold` lose it, as does the "not
  confirmed" count. The words are unchanged, and the toasts that read those two
  messages no longer get raw codes.
