# Design

## Context

`FundDialog` (`features/fund-wallet`) is a controlled dialog: whoever renders
it holds `open`. The account menu and the wallet chip each render their own.
The new entries differ: the Deploy card lives in `features/deploy`, which may
not import another feature; the tutorial cards are pure `Base*` widgets; and
the faucet-refused toast is rendered by `PgView.setToast` and unmounts after
15 s, which would take a dialog rendered inside it along.

## Decisions

- **A request, and one host.** `features/fund-wallet` gains
  `openFundDialog(from)`, which emits on a module event, and
  `FundDialogHost`, which listens and renders the one `FundDialog` with that
  `from`. `views/flow/Flow.tsx` mounts the host beside `ToastHost`. A toast
  or a card asks; the host owns the dialog, so it outlives the toast, and a
  send pending from one entry holds Send off for the next, since it is the
  same instance. Alternative: a `FundDialog` per entry, as the menu and the
  chip have. Rejected for the toast (unmounts) and because each instance
  keeps its own pending send.
- **A request while open is ignored**, so a second entry cannot reset the
  user's picks or count a second opening.
- **Base components take `onFund`.** `BaseNotEnoughSol`,
  `BaseDeployResultCard` and `BaseTxResultCard` get an optional `onFund`
  prop and draw the button only when it is given; the connected layer
  (`views/flow/stages/Deploy.tsx`, `TurnView`) passes
  `() => openFundDialog(...)`. Keeps the `Base*` components free of the
  fund-wallet slice and `features/deploy` free of another feature.
- **The Deploy card's entry is a `CalloutAction`**, like its other actions; the tutorial cards' is an outline `Button`, like their faucet link (Design alignment, 10 Nov).
- **The menu and the chip keep their own dialogs.** Moving them to the host
  is a refactor with no visible change; left out to keep the diff on #490
  small.

## Risks / Trade-offs

- [Two dialogs could be open at once: the chip's and the host's] → each
  is modal; opening one from a card closes the chip's popover first. Not
  reachable in one click path.
- [The dialog funds one wallet, the card may name another] → the dialog pays
  the current Playground wallet, or the first account when an extension is
  current; a deploy can be short on another. `fundFor(from)(address)` returns
  the entry's action only when the short address is that receiver and a host
  is mounted; otherwise the entry draws no button.
- [The host mounts in Flow] → Flow wraps Home too, so every entry finds it;
  `hasFundDialogHost()` only guards a render with no host, as in a unit test.
