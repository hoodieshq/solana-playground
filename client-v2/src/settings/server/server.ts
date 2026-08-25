import { GITHUB_URL } from "../../constants";
import { PgCommon } from "../../utils";
import { createSetting } from "../create";

const LOCAL_ENDPOINT = "http://localhost:8080";
const FOUNDATION_ENDPOINT =
  "https://playground-server-dot-analytics-324114.de.r.appspot.com";

export const server = [
  createSetting({
    id: "server.endpoint",
    description: "Build server URL",
    values: [
      { name: "Local", value: LOCAL_ENDPOINT },
      { name: "Solana Foundation", value: FOUNDATION_ENDPOINT },
    ],
    default:
      // Docker builds use this environment variable to set the server URL
      // to the production API (instead of local) if the user has not yet
      // built the server image
      process.env.REACT_APP_SERVER_URL ??
      (process.env.NODE_ENV === "production"
        ? FOUNDATION_ENDPOINT
        : LOCAL_ENDPOINT),
    custom: {
      parse: (v) => {
        if (PgCommon.isUrl(v)) return v;
        throw new Error(`The setting value must be a URL: ${v}`);
      },
      type: "URL",
      placeholder: "https://...",
      tip: `Make sure the endpoint runs [the playground server](${GITHUB_URL}/tree/master/server).`,
    },
  }),
];
