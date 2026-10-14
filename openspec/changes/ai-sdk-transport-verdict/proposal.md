# Proposal

## Why

HOO-1754 plans to move the assistant's transport to the Vercel `ai` SDK. The
SDK was rejected once, when `client-v2` ran React 17 and the SDK's core looked
Node-only. React 19 (HOO-1850) removed the first reason, so HOO-1753 probed
the SDK again before anyone builds the migration. The probe found that the
SDK now runs in `client-v2`, but that it gives the C rail (the cost gate,
HOO-1751, and the session token, HOO-1788) nothing it needs, and would
regress the Anthropic path if that moved too. This change records that
verdict for review, so the team agrees on it before HOO-1754 is cancelled.

## What Changes

- The assistant keeps its two transports: the chat-completions loop in
  `model/openai.ts` (which also drives the default backend) and the
  Anthropic Tool Runner in `model/anthropic.ts`. No code changes.
- The `ai` SDK and its provider packages are not added to `client-v2`.
- HOO-1754 ("Migrate the transport to the ai SDK, preserving tools and
  approvals") is cancelled once this change is approved.
- `design.md` records the evidence, the reasons, what would carry over, and
  the conditions under which the question is reopened.
- No slice under `features/` or `widgets/` changes; no telemetry event is
  added, renamed, or removed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The change records a decision not to change the transport, so no
requirement changes; `.openspec.yaml` sets `skip_specs`.

## Impact

- Code: none. The probe lived on a local throwaway branch and none of it
  lands.
- Planning: HOO-1754 leaves the C rail milestone. HOO-1751 and HOO-1788 are
  built in `client-v2/api/agent.mjs` without waiting on a transport change.
- Users: nothing changes. Had the migration gone ahead, every first load
  would download about 205 KB more gzipped JavaScript, and, had the Anthropic
  path moved as well, answers that pause mid-turn would end silently instead
  of resuming.
- Out of scope:
  - Moving the agent loop to a server. If that happens, the SDK is weighed
    again there (see design.md, "Reopen when").
  - Retry policy for the existing transports.
  - Reading per-turn usage in `api/agent.mjs`; that is HOO-1751's work.
