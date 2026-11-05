# Tasks

## 1. The + menu

- [x] 1.1 Remove "Connect a model…" / "Connection and key…" and K from the
      composer's + menu, drop `onConnect` and `connectLabel` from
      `BaseAssistantComposer`, drop `via: "add"` from `assistant_connect_opened`
      in `model/telemetry.ts`, and turn the e2e test "Connect a model from the +
      menu" into "The + menu holds context only" (DES-208, #366; no
      dependencies)
