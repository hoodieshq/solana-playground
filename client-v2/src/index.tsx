import React from "react";
import { createRoot } from "react-dom/client";

import App, { applyFavicon } from "./app";
import { observabilityEnv } from "./shared/config/client-env";
import { Observability } from "./widgets/observability";
import "./index.css";

const env = observabilityEnv();

applyFavicon();

// Local design review of DES-195 and DES-193 (`?review=deploy-wallet`)
const DeployWalletReview = React.lazy(
  () => import("./views/review/DeployWalletReview")
);
const reviewing =
  new URLSearchParams(window.location.search).get("review") === "deploy-wallet";
// The app's own theme provider is not mounted there; draw it in the default dark
if (reviewing) {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}

createRoot(document.getElementById("root")!).render(
  reviewing ? (
    <React.Suspense fallback={null}>
      <DeployWalletReview />
    </React.Suspense>
  ) : (
  <React.StrictMode>
    <Observability
      sentry={{
        dsn: env.SENTRY_DSN,
        release: env.VERCEL_GIT_COMMIT_SHA,
        environment: env.VERCEL_ENV,
      }}
      googleAnalytics={{ measurementId: env.GA_MEASUREMENT_ID }}
      fallback={<p role="alert">Something went wrong. Reload the page.</p>}
    >
      <App />
    </Observability>
  </React.StrictMode>
  )
);
