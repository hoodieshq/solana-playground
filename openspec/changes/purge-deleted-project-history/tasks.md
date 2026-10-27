# Tasks

## 1. Erase a deleted project's history (HOO-1738)

- [x] 1.1 `deleteProject` deletes the messages of every conversation under the project and clears their titles, in its transaction; verify with new cases in `model/projects.test.mjs` and `model/conversations.test.mjs` (other project, other user, 410 still answered) under `yarn test-api`, each failing before the change
- [x] 1.2 Migration erasing messages and titles of conversations already tombstoned, then `yarn db-dump`; verify by seeding a tombstoned and a live conversation on a local database, running `yarn db-migrate`, and checking only the tombstoned one is emptied (depends on nothing; may run beside 1.1)
- [x] 1.3 The `delete-workspace` dialog lists the assistant chat among what is deleted; verify by opening the dialog in the running app (manual scenario)
