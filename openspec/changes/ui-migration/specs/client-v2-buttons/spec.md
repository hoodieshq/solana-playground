# Spec Delta

## Purpose

What a button does when pressed: the one call to action a screen offers,
waiting on the work it starts, copying a value, and reporting a click that
fails.

## ADDED Requirements

### Requirement: The one call to action carries the brand ring

A view SHALL show at most one brand button, for its one decisive action. Every
other button SHALL be flat. Buttons SHALL keep their labels, `aria-label`s and
test ids when they change kind.

#### Scenario: The Build stage offers Deploy as a brand button

- **WHEN** a build succeeds on the Build stage
- **THEN** the stage shows one brand button, labelled to go on to Deploy

### Requirement: A button that starts work waits for it

A button whose action runs until a promise settles SHALL be disabled and
marked busy until it settles, and SHALL say what it waits for where a text is
given. It SHALL accept clicks again once the work ends, whether the work
succeeded or failed.

#### Scenario: Build cannot be started twice

- **WHEN** a user presses Build and the build is still running
- **THEN** the Build button is disabled and busy, and a second press starts nothing

### Requirement: Copy says it copied

A copy button SHALL put its value on the clipboard and say "Copied" until the
message times out, then "Copy" again. If the clipboard refuses the value, it
SHALL NOT say "Copied".

#### Scenario: Copying a share link

- **WHEN** a user presses the copy button beside a value
- **THEN** the clipboard holds that value and the button says "Copied"

#### Scenario: A refused clipboard is not reported as copied

- **WHEN** the browser refuses to write to the clipboard
- **THEN** the button does not say "Copied" and the failure is reported

### Requirement: A failing click is reported, not swallowed

A click whose action fails SHALL be reported to the team (a log entry marked
for reporting) and SHALL leave the button usable.

#### Scenario: A rejected action is logged for reporting

- **WHEN** a button's action rejects
- **THEN** the failure is logged under `ui:button`, marked for reporting, and the button is enabled again
