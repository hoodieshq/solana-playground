# Slack: Almaz asks Nikita which dark-theme direction to roll out (2026-11-02)

## Source
Slack, Almaz Zaripov to Nikita Treptsov, 2026-11-02 14:14 (his clock); passed on by Slava at 14:39. Raw: `.claude/intake/raw/2026-11-02-slack-almaz-theme-direction.md`.

## Decided
Nothing. The question to Nikita is open.

## Requirements changed
None yet.

## Facts learned
- Almaz moved the tutorial components into the design-system library: 30 new, 13 updated, in a separate section "From the tutorial" of the design-system preview.
- During the iterations he moved the tutorial away from Nikita's styleguide toward a calm dark look.
- Rolling that look out as the dark default would change: backgrounds `#101011` -> `#141413`, panels `#161617` -> `#1F1E1D`, warm translucent borders; text `#F2F2F3` -> `#CBC9C0`; primary buttons purple -> light `#F5F4EE` with dark text; `--brand-purple` and `--ring` become gray (active menu item, current step, selected framework, focus); tooltips dark without an arrow, quieter hovers, chat cards one tone darker than the column.
- Options he offered: (1) roll out as in the tutorial; (2) warm backgrounds, text and quiet hovers, purple kept for active, focus and the primary button; (3) tutorial look as a separate theme, default untouched. He leans to 2.

## Open questions
- Nikita's answer (1, 2 or 3).
- Option 2 still changes background and text colours, so it departs from the prototype that is the 1:1 target; whether that is accepted is for design alignment.

## Actions
- Compare the three options with the prototype and the design system, and track Nikita's answer -> design alignment.
