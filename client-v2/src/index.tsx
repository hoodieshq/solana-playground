import React from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import { Observability } from "./widgets/observability";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Observability
      sentry={{
        dsn: process.env.REACT_APP_SENTRY_DSN,
        // Vercel copies its system variables with the CRA prefix at build time
        release: process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA,
        environment: process.env.REACT_APP_VERCEL_ENV,
      }}
      googleAnalytics={{
        measurementId: process.env.REACT_APP_GA_MEASUREMENT_ID,
      }}
      fallback={<p role="alert">Something went wrong. Reload the page.</p>}
    >
      <App />
    </Observability>
  </React.StrictMode>
);
