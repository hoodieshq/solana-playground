# Tasks

## 1. Key in memory only, and Delete my key (HOO-2423)

- [ ] 1.1 ([plan](plans/1.1-key-in-memory.md)) Stop keeping the key in `sessionStorage`: `rememberBackend` writes only the keyless parameters, `useTurn` drops the kept-key reconnect and removes a legacy `assistant.connection` entry on mount, and the Connect a model note says the key stays in this tab's memory; Settings gets the Assistant section with **Delete my key** (`settings_key_deleted`), and the head's More item is renamed **Delete my key** (`assistant_key_deleted`). Verify: in-source tests of `remembered-backend`, the settings-page and assistant head tests assert the events through the memory provider, and the e2e scenarios of `assistant-own-key` ("A reload asks for the key again", "A key an older build kept is removed", "Delete my key from Settings", "Delete my key from the chat header", "No key, nothing to delete") pass. No dependency.
