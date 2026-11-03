# Spec Delta

## Purpose

How code in `client-v2` logs, how each entry names its origin, which providers
receive it, and which entries reach Sentry, so that a failure in a user's
browser reaches the team with enough context to find its source.

## ADDED Requirements

### Requirement: Every entry has a namespace

Every log entry SHALL carry a namespace of the form `<slice>:<module>`. An
entry from `Logger` without an `ns` option SHALL carry `app:common`; an entry
with an `ns` option SHALL carry that value; an entry from a logger made by
`createLogger(ns)` SHALL carry `ns` unless the call overrides it.

#### Scenario: The default namespace

- **WHEN** `Logger.warn("clipboard unavailable")` is called
- **THEN** the memory provider records namespace `app:common`

#### Scenario: A per-call namespace

- **WHEN** `Logger.error(error, { ns: "wallet:connect" })` is called
- **THEN** the memory provider records namespace `wallet:connect`

#### Scenario: A bound logger

- **WHEN** `createLogger("persistence:sync").error(error)` is called
- **THEN** the memory provider records namespace `persistence:sync`

#### Scenario: Console output

- **WHEN** the console provider receives an entry with namespace
  `persistence:sync`
- **THEN** the printed line starts with `[persistence:sync]`

### Requirement: Providers configured later receive entries from loggers created earlier

A logger SHALL send each entry to the providers configured at the time of the
call, not at the time the logger was created.

#### Scenario: A module-level logger and a later initLogger

- **WHEN** a logger is created at module import, `initLogger` is then called
  with the memory provider, and the logger logs an error
- **THEN** the memory provider receives the entry

### Requirement: Console is the default provider

Before `initLogger` is called, entries SHALL go to the console provider.
`initLogger` SHALL replace the provider list with the one it is given. The
console provider SHALL map `panic` and `error` to `console.error`, `warn` to
`console.warn`, `info` to `console.info`, and `debug` to `console.debug`, and
SHALL print only entries at or above its threshold: `debug` in development,
`warn` in production, or the level in `REACT_APP_LOG_LEVEL` when set.

#### Scenario: An error during start-up

- **WHEN** an error is logged before `initLogger` runs
- **THEN** it is printed with `console.error`

#### Scenario: Production threshold

- **WHEN** a production build logs at `info` and at `warn` with
  `REACT_APP_LOG_LEVEL` unset
- **THEN** only the `warn` entry is printed

#### Scenario: The app's configuration

- **WHEN** the app starts
- **THEN** `initLogger` is called once, by the `Observability` widget, with
  the console and Sentry providers

### Requirement: Sentry receives reported entries through one provider

The logger SHALL reach Sentry only through
`shared/lib/logger/providers/sentry.ts`; no other logger provider SHALL
import `@sentry/*`. The Sentry provider SHALL send every `panic` entry, and
every `error` or `warn`
entry logged with `report: true`, and no `info` or `debug` entry, as an event;
an entry at `warn` or above that is not reported reaches Sentry only as a
breadcrumb, which no report is sent for. It SHALL set
the tag `ns` to the entry's namespace, and SHALL do nothing when
`REACT_APP_SENTRY_DSN` is unset.

#### Scenario: A Sentry import in another logger provider

- **WHEN** a file under `shared/lib/logger/providers/` other than the Sentry
  provider imports `@sentry/react`
- **THEN** `yarn lint` fails

#### Scenario: An error not marked for reporting

- **WHEN** `Logger.error(error)` is called without `report: true`
- **THEN** the Sentry provider sends no event, and keeps the entry as a
  breadcrumb for the next report

#### Scenario: A reported error

- **WHEN** `createLogger("persistence:sync").error(error, { report: true })`
  is called with a DSN configured
- **THEN** Sentry receives an exception event at level `error` with tag
  `ns: persistence:sync`, the build's release, and its environment

#### Scenario: No DSN

- **WHEN** a build without `REACT_APP_SENTRY_DSN` logs a panic
- **THEN** nothing is sent and nothing throws

### Requirement: Unhandled and render errors go through the logger

The logger SHALL log with `Logger.panic` every uncaught error, unhandled
promise rejection, and error thrown while rendering, and Sentry SHALL NOT
capture them through any other path. A rejection the terminal already showed
the user as a "Process error" is the exception: it is logged at `warn`, a
breadcrumb only.

#### Scenario: An unhandled rejection

- **WHEN** a promise rejects and nothing handles it
- **THEN** the memory provider records a `panic` entry with namespace
  `logger:global`, and Sentry receives exactly one event for it, marked
  unhandled

#### Scenario: A terminal command fails as expected

- **WHEN** a terminal command fails in a way the user is shown (an unknown
  command, a declined wallet question, any "Process error" line) and the
  rejection reaches the global handler
- **THEN** the memory provider records a `warn` entry with namespace
  `logger:global`, not reported, and Sentry receives no event for it

#### Scenario: A component throws while rendering

- **WHEN** a component under the root `LoggerErrorBoundary` throws during
  render
- **THEN** the memory provider records a `panic` entry with namespace
  `app:render`, and the boundary renders its fallback

### Requirement: A thrown value that is not an Error keeps its value

When an entry is logged with a value that is not an `Error`, the logger SHALL
create an `Error` whose message is the value converted to a string and whose
`cause` is the original value.

#### Scenario: A string is thrown

- **WHEN** `Logger.error("timeout")` is called with a string as the error
- **THEN** the recorded entry's error is an `Error` with message `timeout`
  and `cause` `"timeout"`

### Requirement: Code in the layers logs through the logger

Code under `src/{features,shared,entities,widgets}/` SHALL NOT call
`console.*`, except `shared/lib/logger/providers/console.ts`. A `catch` in
those layers SHALL rethrow, log through the logger, or show the failure to
the user.

#### Scenario: A console call in a feature

- **WHEN** a file under `features/` calls `console.error`
- **THEN** `yarn lint` fails

#### Scenario: Output of the user's code

- **WHEN** a legacy root such as `utils/js-runtime` or a `.raw` template
  calls `console.log` for the user's program
- **THEN** the lint rule does not apply

### Requirement: Stack traces in Sentry are readable and source maps are private

Each production build SHALL upload its source maps to Sentry under a release
named after the commit SHA, and SHALL NOT deploy the `.map` files.

#### Scenario: An error from production

- **WHEN** Sentry receives an error from a production build
- **THEN** its stack trace shows original file names and lines

#### Scenario: Requesting a source map

- **WHEN** a browser requests `/static/js/<bundle>.js.map` from the deployed
  site
- **THEN** the response is not the source map

### Requirement: Reports carry no user code or secret key

An error event the browser sends to Sentry SHALL NOT carry the user's program
output or a secret key. Sentry's `Console` integration SHALL be off and every
`console` breadcrumb dropped; the logger's own trail SHALL reach Sentry as
breadcrumbs the reporter adds, one per entry at `warn` or above. In every
value of an error event and of a breadcrumb, a hex or base58 run of 64 or more
characters, a list of 32 or more numbers from 0 to 255 (bracketed, bare,
or as an index-keyed object), and a typed array of 32 or more bytes, SHALL be
replaced with `[redacted]`, in keys as in values.
An event that cannot be scrubbed SHALL be replaced by one that says it was
withheld. Public keys (32 to 44 base58 characters) SHALL be kept. A feedback
SHALL be sent as the user wrote it: it is text they chose to send. The
scenarios below are automated by `reporter/sentry.integration.test.ts`, which
runs the real SDK, and checked by hand on a preview with a DSN.

#### Scenario: The user's test prints to the console (manual)

- **WHEN** a test the user runs prints a value with `console.log`, even one
  that starts with a `[slice:module]` tag, and an error is reported afterwards
- **THEN** the report's breadcrumbs do not include that output

#### Scenario: A secret key in an error message (manual)

- **WHEN** a reported error's message quotes a 64-byte secret key, as base58
  or as a JSON byte array
- **THEN** the report shows `[redacted]` in its place

#### Scenario: A secret key in a reported context (manual)

- **WHEN** a reported entry's context holds a secret key as a `Uint8Array`
- **THEN** the report shows `[redacted]` in its place

#### Scenario: A wallet address in a reported context (manual)

- **WHEN** a reported entry's context holds a wallet's public key
- **THEN** the report shows the public key as it was
