import { useEffect, useState } from "react";

import { DEFAULT_BACKEND_URL } from "./types";

/**
 * Whether this deployment configured a default backend.
 *
 * Asked once per page and shared: the composer's model menu, the connect form
 * and the send path all want the answer, and each asking for itself meant the
 * same request three times on every project open.
 */
let probe: Promise<boolean> | null = null;

export const probeDefaultBackend = () => {
  if (!probe) {
    probe = fetch(DEFAULT_BACKEND_URL)
      .then((r) => (r.ok ? r.json() : { configured: false }))
      // A static host answers with the app's own HTML, which is not JSON
      .catch(() => ({ configured: false }))
      .then((body) => !!body?.configured);
  }
  return probe;
};

/**
 * The same answer as a hook: `undefined` while it is outstanding, so the
 * option is neither offered nor ruled out until the server has said.
 */
export const useDefaultBackend = () => {
  const [configured, setConfigured] = useState<boolean>();

  useEffect(() => {
    let live = true;
    probeDefaultBackend().then((v) => live && setConfigured(v));
    return () => {
      live = false;
    };
  }, []);

  return configured;
};
