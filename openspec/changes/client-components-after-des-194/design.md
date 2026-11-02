# Design

## Context

Toasts render through Sonner (`widgets/overlays/ui/ToastHost.tsx`); our
content sits inside Sonner's default toast, which keeps its own timer and
pauses it while the toasts are expanded (pointer over them) or the page is
hidden. The name field is the design system's `Input` with `FieldError`
under it (`features/new-project/ui/BaseStartFromScratch.tsx`). Tutorial
progress is already read for the catalogue by `useTutorialProgress`
(`entities/tutorial`), which yields `new | started(page, pages) | completed`.

## Goals / Non-Goals

**Goals:** the three pieces as the old client and the prototype draw them,
built from parts client-v2 already has.

**Non-Goals:** a new design-system component or registry entry; changing
Sonner's timer; the rename field's error placement in the list.

## Decisions

- **The bar is a CSS animation, not a timer.** A `scaleX(1 → 0)` keyframe
  over the toast's duration, `linear`, `transform-origin: left`. It pauses
  through `animation-play-state` on the same states Sonner pauses on
  (`[data-expanded="true"]` on the toast, and the document hidden is moot:
  CSS animations stop with it). Alternative: read Sonner's remaining time in
  JS each frame. Rejected: Sonner exposes no remaining time, and a parallel
  timer drifts from the one that closes the toast.
- **The bar is drawn by the host, not by each toast.** `ToastHost` wraps
  every toast's content with the bar when the duration is finite, so all
  toasts get it and none can forget it. Persistent (`Infinity`) gets none.
- **Reduced motion hides the bar** (`motion-reduce:hidden`). A static full
  bar would claim a time it does not show.
- **Success edge on format only.** The field marks a typed name that passes
  the same character rule Start checks (`isValidName` shared with the
  container, not re-implemented); taken is known only on Start (Spec 09).
  `data-state="valid"` drives `border-success` so tests read a state, not a
  colour.
- **Message before the field.** `FieldError` moves ahead of the input: on
  its left in the one row (the prototype's place; above would be clipped by
  New project's scroll area and push the field off the chips' centre line),
  above it when the row stacks. `aria-describedby` already links it.
- **Lesson progress joins `ProjectEntry`.** `listProjects` takes a
  `progressOf(name)` dependency; `ProjectList` passes `useTutorialProgress`'s
  reader for lessons. `BaseProjectList` draws it in the marker slot with a
  described-by id, as it does the sync marker.

## Risks / Trade-offs

- [Sonner's `data-expanded` is not its exact pause condition (it also pauses
  while a toast is swiped)] → a swipe dismisses the toast anyway; the bar can
  only be off while a finger is on it.
- [Reversing R60] → Slava chose it on 2 Nov; the gap is in the designers'
  DES-194 review pack.
