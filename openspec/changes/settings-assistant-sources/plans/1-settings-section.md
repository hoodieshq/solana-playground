# Plan: Skills and MCP servers in Settings › Assistant

Ticket: HOO-2710. Change: `settings-assistant-sources`, task 1.1.

1. Test first (`Grounding.test.tsx`): two Grounding views rendered at once;
   unticking a skill by its name in the second unticks it in the first and
   drops it from `PgAssistant.enabledSkillIds`. Fails today: both views share
   ids, so the second label toggles nothing new and the ids collide.
2. `Grounding.tsx`: `useId()` prefix on every element id; an `embedded` prop
   that drops the panel's scroll and grow classes.
3. `SettingsPage.tsx`: a second `BaseSettingsCard` titled "Skills and MCP
   servers" in the Assistant section with `<Grounding embedded />`, and a
   `useEffect` calling `PgAssistant.initMcp()` while the section is mounted.
4. Gate: `yarn run check`; screenshots of Settings › Assistant before/after.
