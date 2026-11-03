# Design

## Context

Settings, Network draws `BaseNetworkChoice`: `segmented` chips for the offered networks (`NETWORKS`: Devnet, Mainnet on the platform RPCs), checked by comparing `PgSettings.connection.endpoint` with each chip's URL. A custom URL can only be set through the Connection section's generic Endpoint select, whose "Custom" row opens `CustomSetting` in a modal; nothing remembers it once another network is picked.

`connection.endpoint` is stored by `settings/stored-endpoint.ts`: a platform address as its option key, a custom one as `{ option: "custom", url }`. HOO-2498 is changing how that value reads back (a non-URL falls back to Devnet). This change does not touch that file.

No design source draws a list of saved RPCs. The DS gives the setting row (`block-settings`), the chips and the `field` block ("Custom RPC", `https://`); Spec 07 gives the help line and the URL rule. The rest was decided here and accepted by Design alignment on 4 Nov: chips plus a list, inline form, host only wherever a saved RPC is shown, a toast with Undo on remove.

## Goals / Non-Goals

**Goals:**

- Several named custom RPCs, picked as chips beside Devnet and Mainnet.
- Add, edit and remove inline, with the Spec 07 URL rule.
- No provider key on screen: a saved RPC shows its host.
- Existing profiles on a custom URL keep it, now listed.

**Non-Goals:**

- The 5 s health check and "Use anyway" (Spec 07, SET-16).
- Removing the Connection section's Endpoint select (SET-08).
- Syncing the list to the account or across tabs live.

## Decisions

**An entity, `entities/custom-rpc`.** The saved list is a domain object read by the settings page today and by the sidebar's network row later; an entity is where both can reach it without a feature importing another. Its `model/` holds the pure rules (`checkRpcUrl`, `hostOf`, `nameFor`, add / replace / remove on an array) and a small store (`PgCustomRpcs`: `list()`, `save()`, `remove()`, `restore()`, `onDidChange()`), with in-source tests. The UI stays in the widget.

**Its own `localStorage` key, `customRpcs`.** A JSON array of `{ name, url }`. Putting it inside `settings` would make it a setting `PgSettings` renders in a generic section, and `toStoredEndpoints` would have to learn a third shape. A few entries cost a few hundred bytes of the origin's budget. An unreadable value reads as an empty list and is reported through the logger, never thrown.

**The picked RPC is still `connection.endpoint`.** Picking a chip sets the endpoint to the RPC's URL, so every reader of the connection (the provider, the wallet, deploys) works unchanged, and the stored shape stays `{ option: "custom", url }`. The list never stores which one is picked.

**A custom endpoint not in the list is adopted.** On first read, and whenever `connection.endpoint` changes to a URL that is neither offered nor listed, the store appends `{ name: host, url }`. That covers profiles from before this change and URLs set through the Connection select or the terminal. A URL `stored-endpoint.ts` keys (the offered networks, the public Devnet and Mainnet, Testnet, Localnet, Playnet) is not custom and is never adopted; neither is one that fails the URL rule.

**URL rule.** `new URL(value)` parses, protocol `https:`, or `http:` with hostname `localhost` or `127.0.0.1`. Stricter than `PgCommon.isUrl`, which HOO-2498 uses for reading back, so anything we save reads back as itself.

**Host only.** Rows, a default name, the toast and the duplicate line use the name (which defaults to `URL.host`); no place outside the edit field renders the full URL.

**Remove with Undo.** Remove drops the entry at once; if it was picked, `connection.endpoint` becomes `DEFAULT_ENDPOINT` (the offered Devnet). The toast's Undo restores the entry at its old index and re-picks it if it was picked. No confirm dialog.

**Widget pieces.** `BaseNetworkChoice` takes `custom: { name, url }[]` and renders their chips after the offered ones. A new `BaseCustomRpcs` draws the list, the "Add custom RPC" button and the form (DS `field`, `input`, `input-group`, `button`), all through props. `SettingsPage` connects both to `PgCustomRpcs` and `PgSettings`, and sends the three events.

## Risks / Trade-offs

- [Two controls still set the endpoint] → the adoption rule keeps the list right whichever is used; SET-08 is in Lead's intake.
- [A URL with a key sits in `localStorage`] → it did already for one custom URL; Spec 07 accepts it ("It stays in this browser"), and nothing sends it to analytics or sync.
- [HOO-2498 lands first and changes the read-back] → our rule is a subset of its rule; rebase only.

## Migration Plan

None beyond adoption: a profile's existing custom endpoint is listed on first read. Rollback leaves an unused `customRpcs` key.

## Open Questions

None open; the gaps went to the designers' batch as "ships as built".
