# Spec Delta

## Purpose

The widget that turns the logger, Sentry, and telemetry on for the app, so
their configuration is one typed contract instead of calls scattered through
start-up.

## ADDED Requirements

### Requirement: One widget initialises logging and telemetry

`widgets/observability` SHALL export `Observability` with the props `sentry`
(`dsn`, `release`, `environment`), `googleAnalytics` (`measurementId`),
`logLevel`, `fallback`, and `children`, and SHALL initialise the logger,
the global error handlers, and telemetry once per page load, before its
children first render.

#### Scenario: StrictMode renders twice

- **WHEN** `Observability` renders under `React.StrictMode` with a DSN
- **THEN** Sentry is initialised once

#### Scenario: A child's first render

- **WHEN** a child of `Observability` renders for the first time
- **THEN** Sentry is already initialised

#### Scenario: A child throws while rendering

- **WHEN** a child of `Observability` throws during render
- **THEN** `fallback` is shown in its place and the error is reported

#### Scenario: No ids

- **WHEN** `Observability` renders without a DSN and without a measurement id
- **THEN** no request goes to Sentry or Google, and the children render

### Requirement: Initialisation is tracked

`widgets/observability` SHALL track `obs_initialised`, with no parameters,
once per page load when initialisation completes.

#### Scenario: The app starts

- **WHEN** `Observability` first renders
- **THEN** `obs_initialised` is tracked once
