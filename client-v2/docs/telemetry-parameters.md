# Telemetry parameters

Every event parameter the trackers declare, by name. GA4 registers a custom
dimension or metric by parameter name across all events, so one name has one
meaning and one type; the rule is the requirement "Event parameters have one
name, one type and a registered kind" in
`openspec/specs/client-v2-telemetry/spec.md`.

`src/app/telemetry-parameters.test.ts` reads this table: it fails when a
parameter is missing here, listed here and gone, or typed differently here,
and when one name has two types in the trackers. Adding a parameter to an
event means adding its row.

- **Type** is what the parameter's TypeScript type reduces to: a string-literal
  union is `string`.
- **Kind** is what GA4 registers it as. `number` is a custom metric.
  `string` and `boolean` are custom dimensions (a boolean arrives as
  `true` or `false`). GA4 allows 50 event-scoped custom dimensions and 50
  custom metrics per property. `conflict` is a name with two types, listed
  below.
- **Funnel** is `yes` when a funnel breaks down by it (`cluster`, `kind`,
  `via`, `source`, `step`, `stage`, `provider`, `tutorial`, `reason`,
  `outcome`), so it has to be registered before the funnel reads it.

| Parameter | Type | Kind | Funnel | Events |
| --- | --- | --- | --- | --- |
| `action` | string | dimension |  | `nav_project_action`, `nav_project_action_failed`, `status_notice_action`, `tutorial_action_run`, `explorer_limit_refused` |
| `after` | string | dimension |  | `assistant_reply_retried` |
| `answer` | string | dimension |  | `sync_whole_file_answered`, `assistant_approval_answered` |
| `answered` | boolean | dimension |  | `status_retried` |
| `attempts` | number | metric |  | `tutorial_question_answered` |
| `by` | string | dimension |  | `sync_file_limit_exceeded`, `sync_project_limit_exceeded`, `sync_files_count_limit_exceeded`, `sync_projects_count_limit_exceeded` |
| `bytes` | number | metric |  | `docs_link_opened` |
| `check` | string | dimension |  | `settings_custom_rpc_saved` |
| `cluster` | string | dimension | yes | `cli_command_copied`, `deploy_started`, `deploy_succeeded`, `deploy_failed`, `deploy_sol_needed_shown`, `fund_sent` |
| `copied` | string | dimension |  | `gist_link_copied` |
| `doc` | string | dimension |  | `tutorial_workspace_doc_opened` |
| `docked` | boolean | dimension |  | `tutorial_workspace_tree_docked` |
| `done` | number | metric |  | `setup_dismissed` |
| `effort` | string | dimension |  | `assistant_effort_changed` |
| `empty` | boolean | dimension |  | `catalog_searched` |
| `enabled` | boolean | dimension |  | `mcp_server_toggled`, `skills_toggled` |
| `errors` | number | metric |  | `tutorial_definition_rejected` |
| `file` | string | dimension |  | `tutorial_change_applied` |
| `files` | number | metric |  | `gist_export_started`, `gist_export_succeeded`, `sync_resolve_opened`, `sync_resolve_applied`, `sync_resolve_stale`, `sync_file_limit_exceeded`, `sync_files_count_limit_exceeded`, `export_downloaded` |
| `framework` | string | dimension |  | `new_project_started`, `new_project_start_failed`, `catalog_filtered` |
| `from` | number/string | conflict |  | `cli_binary_downloaded`, `cli_binary_download_failed`, `cli_guide_opened`, `feedback_github_clicked`, `fund_dialog_opened`, `gist_import_started`, `gist_import_succeeded`, `gist_import_failed`, `sync_whole_file_answered`, `keypair_exported`, `session_account_menu_opened`, `settings_opened`, `status_indicator_picked`, `status_retried`, `tutorial_step_jumped` |
| `host` | string | dimension |  | `docs_link_opened` |
| `how` | string | dimension |  | `sync_resolve_hunk_resolved` |
| `hunks` | number | metric |  | `sync_resolve_opened` |
| `id` | string | dimension |  | `skills_toggled`, `home_quickstart_opened` |
| `indicator` | string | dimension |  | `status_indicator_picked`, `status_retried` |
| `item` | string | dimension |  | `nav_item_opened`, `session_account_item_picked`, `setup_item_picked` |
| `kib` | number | metric |  | `sync_project_limit_exceeded` |
| `kind` | string | dimension | yes | `sync_projects_count_limit_exceeded`, `unknown_command_answered`, `assistant_approval_answered`, `home_recent_opened` |
| `layout` | string | dimension |  | `gist_import_succeeded` |
| `limit` | string | dimension |  | `sync_file_limit_exceeded`, `explorer_limit_refused` |
| `link` | string | dimension |  | `feedback_github_clicked` |
| `mode` | string | dimension |  | `settings_custom_rpc_saved` |
| `name` | string | dimension |  | `overlay_modal_opened`, `overlay_modal_submit_failed`, `overlay_toast_shown` |
| `next` | string | dimension |  | `tutorial_next_opened` |
| `notice` | string | dimension |  | `status_notice_shown`, `status_notice_dismissed`, `status_notice_action` |
| `open` | boolean | dimension |  | `layout_panel_toggled` |
| `outcome` | string | dimension | yes | `docs_link_run_finished`, `mcp_tool_called`, `home_example_run`, `session_sign_out_ended`, `tutorial_action_run` |
| `page` | string | dimension |  | `catalog_shown`, `catalog_searched`, `catalog_item_opened`, `catalog_open_failed`, `catalog_filtered`, `layout_page_shown` |
| `panel` | string | dimension |  | `layout_panel_toggled` |
| `picked` | boolean | dimension |  | `settings_custom_rpc_removed` |
| `pinned` | boolean | dimension |  | `tutorial_frame_menu_pinned` |
| `profile` | string | dimension |  | `export_downloaded`, `export_convert_failed`, `export_failed` |
| `projects` | number | metric |  | `sync_projects_count_limit_exceeded` |
| `provider` | string | dimension | yes | `assistant_model_picked`, `assistant_turn_sent`, `assistant_turn_answered`, `assistant_turn_failed`, `assistant_turn_capped`, `assistant_key_rejected` |
| `question` | string | dimension |  | `tutorial_question_answered` |
| `rating` | number/string | conflict |  | `feedback_sent` |
| `reason` | string | dimension | yes | `agent_refused`, `auth_sign_in_failed`, `cli_binary_download_failed`, `deploy_sol_needed_shown`, `docs_link_failed`, `fund_failed`, `gist_export_failed`, `gist_import_failed`, `mcp_tools_list_failed`, `sync_resolve_apply_failed`, `keypair_import_refused`, `export_convert_failed`, `assistant_ai_off_shown`, `assistant_turn_failed`, `assistant_default_probe_failed`, `assistant_reply_failed`, `layout_restore_failed`, `settings_custom_rpc_refused`, `tutorial_workspace_terminal_opened`, `tutorial_step_passed` |
| `redeploy` | boolean | dimension |  | `deploy_started`, `deploy_succeeded` |
| `refused` | boolean | dimension |  | `tutorial_word_sent` |
| `replaced` | boolean | dimension |  | `keypair_generated` |
| `result` | string | dimension |  | `tutorial_question_answered` |
| `retried` | boolean | dimension |  | `mcp_tool_called` |
| `seconds` | number | metric |  | `docs_link_run_finished`, `tutorial_finished`, `tutorial_step_passed`, `tutorial_action_run` |
| `section` | string | dimension |  | `settings_section_picked` |
| `server` | string | dimension |  | `mcp_tools_listed`, `mcp_tools_list_failed`, `mcp_tool_called`, `mcp_session_reopened`, `mcp_server_toggled` |
| `side` | string | dimension |  | `sync_resolve_hunk_resolved` |
| `signed_in` | boolean | dimension |  | `nav_handoff_opened` |
| `source` | string | dimension | yes | `docs_link_run_started`, `docs_link_run_finished`, `gist_export_started`, `tutorial_question_asked` |
| `space` | string | dimension |  | `tutorial_frame_space_changed` |
| `stage` | string | dimension | yes | `fund_failed` |
| `state` | string | dimension |  | `catalog_banner_opened`, `status_indicator_picked` |
| `status` | number | metric |  | `assistant_turn_failed` |
| `step` | number/string | conflict | yes | `cli_command_copied`, `deploy_failed`, `tutorial_step_passed`, `tutorial_step_reset`, `tutorial_step_jumped`, `tutorial_step_back`, `tutorial_question_asked`, `tutorial_word_sent`, `tutorial_action_run` |
| `tab` | string | dimension |  | `catalog_tab_switched` |
| `tier` | string | dimension |  | `agent_refused` |
| `tile` | string | dimension |  | `home_tile_opened` |
| `tool` | string | dimension |  | `cli_command_copied` |
| `tools` | number | metric |  | `mcp_tools_listed` |
| `tutorial` | string | dimension | yes | `tutorial_definition_rejected`, `tutorial_opened`, `tutorial_started`, `tutorial_finished`, `tutorial_question_answered`, `tutorial_next_opened`, `tutorial_receipt_copied`, `tutorial_step_passed`, `tutorial_step_reset`, `tutorial_step_jumped`, `tutorial_step_back`, `tutorial_question_asked`, `tutorial_word_sent`, `tutorial_change_applied`, `tutorial_change_kept`, `tutorial_action_run` |
| `via` | string | dimension | yes | `nav_project_action`, `assistant_model_picked`, `assistant_connect_opened`, `assistant_context_file_added`, `assistant_patch_undone`, `catalog_shown`, `home_shown`, `home_left`, `layout_panel_toggled`, `layout_page_shown`, `layout_work_view`, `settings_closed`, `tutorial_frame_menu_opened`, `tutorial_frame_chat_resized`, `tutorial_frame_space_changed`, `tutorial_workspace_tree_opened`, `tutorial_workspace_file_opened`, `tutorial_workspace_doc_opened`, `tutorial_step_passed`, `tutorial_step_jumped` |
| `view` | string | dimension |  | `layout_work_view` |
| `viewport` | string | dimension |  | `layout_viewport` |
| `visibility` | string | dimension |  | `gist_export_started`, `gist_export_succeeded`, `gist_export_failed` |
| `wallet` | string | dimension |  | `docs_link_run_funding_shown`, `fund_wallet_connected` |
| `wide` | boolean | dimension |  | `layout_assistant_widened` |
| `width` | number | metric |  | `tutorial_frame_chat_resized` |
| `word` | string | dimension |  | `tutorial_word_sent` |
| `worst` | string | dimension |  | `status_sheet_opened` |

## Counts

79 names: 64 dimensions, 12 metrics, 3 conflicting (`from`, `rating`, `step`). The dimension count is over GA4's 50, so register by funnel need first, and trim names that no report reads.

## Open decisions

HOO-2752 leaves these to the product, and the test tolerates them:

- **Conflicting types.** `step` is the step number in the `tutorial_*` events and a
  stage name in `deploy_failed` and `cli_command_copied`; `from` is the trigger in
  14 events and the step number in `tutorial_step_jumped`; `rating` is a star count
  or the text `none` in `feedback_sent`. All are on `master`, so renaming
  them (`step_index`, `from_step`) starts a new GA4 history. The test lists them as
  known conflicts until they are renamed.
- **Same type, different meaning.** `wallet` is a free string in
  `fund_wallet_connected` and an enum in `docs_link_run_funding_shown`;
  `state` is a different enum in `status_indicator_picked` and in
  `catalog_banner_opened`. The test cannot see this, since both are `string`.
- **Trigger synonyms.** `via`, `from` and `source` all say what started an action.
- **Duplicated events.** `assistant_key_deleted` and `settings_key_deleted`.
