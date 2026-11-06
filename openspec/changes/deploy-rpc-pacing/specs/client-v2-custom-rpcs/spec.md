# Spec Delta

## MODIFIED Requirements

### Requirement: The list stays in this browser

The saved RPCs SHALL be stored in this browser only, names and URLs, under a `localStorage` key of their own. A profile whose connection endpoint is a custom URL not in the list SHALL see it added, named by its host (Testnet and Localnet by their names), and checked. An address a chip already offers (the URL the Devnet or Mainnet chip opens) SHALL never be added. While the Devnet or Mainnet chip offers a platform RPC in place of the public one, the public devnet or mainnet URL is not an address that chip offers: a profile on it SHALL see it added as a custom RPC, named by its host, and checked.

#### Scenario: A custom endpoint from before is listed

- **WHEN** a profile already on a custom endpoint URL, written without a trailing slash, opens Settings
- **THEN** that URL is a chip named by its host, and checked

#### Scenario: A public devnet URL beside a platform devnet is listed (manual)

- **WHEN** the env sets a platform devnet RPC and a profile whose endpoint is `https://api.devnet.solana.com` opens Settings
- **THEN** the Network row shows Devnet, Mainnet and a chip `api.devnet.solana.com`, and that chip is checked
