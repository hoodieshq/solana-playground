import React from "react";
import { createRoot } from "react-dom/client";

import App, { applyFavicon } from "./app";
import { observabilityEnv } from "./shared/config/client-env";
import { Observability } from "./widgets/observability";
import "./index.css";

const env = observabilityEnv();

applyFavicon();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Observability
      sentry={{
        dsn: env.SENTRY_DSN,
        release: env.VERCEL_GIT_COMMIT_SHA,
        environment: env.VERCEL_ENV,
      }}
      googleAnalytics={{ measurementId: env.GA_MEASUREMENT_ID }}
      // Spec 08's fallback (ANY-00) for the whole app: nothing is left on
      // screen to retry from, so it offers a reload. Plain elements, because
      // the boundary sits outside every provider
      fallback={
        <div role="alert">
          <p>
            Playground stopped for a reason we can&apos;t name. Reload the page.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      }
    >
      <App />
    </Observability>
  </React.StrictMode>
);
