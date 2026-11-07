## MODIFIED Requirements

### Requirement: Saved custom RPCs are network chips

The Network row's radio group (`aria-label="Network"`) SHALL show Mainnet, Devnet, Testnet, Localnet, Surfpool, then one chip per saved custom RPC, in the order they were saved, labelled with the RPC's name. Picking a chip SHALL set the connection endpoint to that RPC's URL. On a narrow window the chips SHALL wrap and never scroll sideways.

#### Scenario: Two saved RPCs survive a reload

- **WHEN** a person saves two custom RPCs and reloads the page
- **THEN** both chips are in the Network row after the five offered networks
- **AND** the RPC picked last is still checked

#### Scenario: Picking a custom chip moves the connection

- **WHEN** a person picks a saved custom RPC's chip
- **THEN** RPC requests go to that RPC's URL

### Requirement: The list stays in this browser

The saved RPCs SHALL be stored in this browser only, names and URLs, under a `localStorage` key of their own. A profile whose connection endpoint is a custom URL that no chip and no saved RPC lists SHALL see it added, named by its host (the public Testnet by its name), and checked. An address a chip offers SHALL never be added this way; a public address (the public Mainnet, Devnet or Testnet) is added when its chip is on a platform RPC, since no chip lists it then.

#### Scenario: A custom endpoint from before is listed

- **WHEN** a profile already on a custom endpoint URL, written without a trailing slash, opens Settings
- **THEN** that URL is a chip named by its host, and checked
