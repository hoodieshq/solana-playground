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

### Requirement: Adding a custom RPC

An "Add custom RPC" button SHALL open an inline form with a "Name" field, an "RPC URL" field and a "Save" button, under the help line "Any Solana RPC URL. It stays in this browser." Save or Enter SHALL save a valid entry and pick it. An empty name SHALL save as the URL's host, or as "Testnet" for the public Testnet's address; a name SHALL be at most 32 characters. "Cancel" SHALL close the form and save nothing.

#### Scenario: A new RPC is saved and picked

- **WHEN** a person adds `https://rpc.example.com/?api-key=k` with the name "Helius"
- **THEN** a chip "Helius" appears and is checked

#### Scenario: An unnamed RPC is named by its host

- **WHEN** a person adds `https://rpc.example.com/v1/k` with no name
- **THEN** its chip reads `rpc.example.com`

### Requirement: Chips that share a URL

Chips MAY share a URL. When several list the URL in use, exactly one SHALL be checked: the one picked or saved last, kept in this browser across a reload, while the network is still on its URL; else the first that lists it, the offered networks before saved RPCs. Editing a chip that is not the checked one SHALL NOT move the network, though the network is on its URL. A click on a chip whose URL is already in use SHALL move the check and leave the network as it is. Removing a picked RPC while another chip still lists its URL SHALL leave the network where it is. A URL picked through a custom RPC SHALL stay that URL after a reload, even when it is the public URL of a network a chip offers on another RPC.

#### Scenario: The public Devnet beside Devnet on a platform RPC (manual)

- **WHEN** Devnet is on a platform RPC and a person saves `https://api.devnet.solana.com` as "Public Devnet"
- **THEN** "Public Devnet" is checked and the network is the public Devnet
- **AND** after a reload it still is
