# Spec Delta

## ADDED Requirements

### Requirement: The wallet chip connects an extension wallet

The wallet chip's popover SHALL offer "Connect a wallet" (also the list's heading) while the Playground wallet is current. Pressing
it SHALL list the installed Wallet Standard wallets, each with its icon and name; with none installed it
SHALL say "No wallet extension found in this browser. Install Phantom, Backpack or Solflare, then reload.
Or keep using the Playground wallet.", the same line as the Fund dialog. (The chip is hidden on a phone, so the phone line of
the designers' wallet spec does not apply here.) Choosing
one SHALL show "Waiting for {wallet}…" until the extension answers. An approval SHALL make the extension
the current wallet, as `connect {wallet}` does in the terminal; a decline SHALL say "{wallet} didn't
connect. The Playground wallet is in use." with "Try again". The waiting state SHALL NOT trap: closing the
popover leaves it, reopening while the request is pending shows "Waiting for {wallet}…" again, and a late
approval or decline lands as above.

While an extension is current, the popover's first block SHALL name the extension with its icon in place
of "Playground wallet", show its balance and address, and offer "Disconnect {wallet}", which SHALL make
the Playground wallet current again. "Send from your wallet" SHALL NOT show then, since the current wallet
is the user's own.

#### Scenario: Connect Phantom from the chip

- **WHEN** the Playground wallet is current and the user picks Phantom under "Connect a wallet" and
  approves in the extension
- **THEN** the chip shows Phantom's address and balance, and the popover names Phantom and offers
  "Disconnect Phantom"

#### Scenario: No extension installed

- **WHEN** no Wallet Standard wallet is installed and the user presses "Connect a wallet"
- **THEN** the popover says "No wallet extension found in this browser. Install Phantom, Backpack or
  Solflare, then reload. Or keep using the Playground wallet."

#### Scenario: Disconnect

- **WHEN** Phantom is current and the user presses "Disconnect Phantom"
- **THEN** the Playground wallet is current again and the chip shows its address
