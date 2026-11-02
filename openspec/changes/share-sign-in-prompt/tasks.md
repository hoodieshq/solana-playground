# Tasks

## 1. Sign in to share (HOO-2484)

- [ ] 1.1 Export `GithubMark` from `widgets/session-footer/index.ts`; verify with `yarn test-types` and `yarn lint` (no boundary error).
- [ ] 1.2 Add an optional `icon` to `ModalSubmit` and `BaseModalFrame`'s submit, drawn before the label and replaced by the spinner while busy; verify with a `BaseModalFrame` test (icon shown, hidden while busy). Depends on nothing.
- [ ] 1.3 In `app/ShareGistDialog`, show the "Sign in to share" prompt while signed out and the share dialog once signed in, per the `gist-sharing` delta; verify with a `ShareGistDialog` test covering every scenario of the delta (prompt first, sign-in returns to sharing with no gist request, signed in skips it, cancelled stays with its reason, Cancel closes). Depends on 1.1 and 1.2. Plan: [plans/1.3-sign-in-to-share.md](plans/1.3-sign-in-to-share.md).
- [ ] 1.4 Update `docs/upstream-divergences.md` if it lists the share flow, and take before/after screenshots (desktop and phone, signed out); verify the screenshots show the prompt with the mark.
