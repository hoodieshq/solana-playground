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

## Update 2026-11-02 16:44: Nikita's replies
Raw: `.claude/intake/raw/2026-11-02-slack-almaz-nikita-theme-replies.md`.

### Decided
Nothing. Nikita did not pick an option; he asked for reasons and a side-by-side check. Almaz agreed to build the comparison and look together.

### Facts learned
- Why the tutorial palette moved: after the 23 Oct call the client asked for the desktop tutorial through the assistant chat (2 columns instead of 4); long one-column reading on near-black with cold greys read harshly. Almaz warmed the greys, lightened the background and quieted the buttons, and wants a white primary button in the tutorial only.
- Almaz's scope: only tutorial screens for now. DES-193 and DES-195 use the original DS with purple; what moves into the system is decided together once those are ready.
- Nikita's objections: unclear why WCAG-passing colours changed, why the target action is not purple, why the brand colour is lost. He asked for a Night Shift test.
- Compare stand (tutorial palette left, styleguide right, simulated Night Shift, 12 token checks x 3 modes): tutorial 32/36, styleguide 28/36. Tutorial at max warmth: secondary grey text sags, light button drifts to orange near warning. Styleguide: purple button and focus about 3:1 against the background already, lower with warmth; background and panels barely differ. It is a simulation; Almaz will check by eye on a live screen.

### Open questions
- Nikita's decision after seeing the stand (1, 2 or 3).
- Almaz's live Night Shift check.

### Actions
- Forward the replies and the stand result -> design alignment.
