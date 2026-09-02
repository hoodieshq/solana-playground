import { GITHUB_URL } from "../../constants";
import { PgCommon } from "../../utils";
import { createSetting } from "../create";
import {
  defaultServerEndpoint,
  SAME_ORIGIN_ENDPOINT,
} from "./default-endpoint";

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
      { name: "This site (proxy)", value: SAME_ORIGIN_ENDPOINT },
    ],
    // Docker builds use REACT_APP_SERVER_URL to point at the production API
    // (instead of local) if the user has not yet built the server image
    default: defaultServerEndpoint(
      {
        REACT_APP_SERVER_URL: process.env.REACT_APP_SERVER_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
      { local: LOCAL_ENDPOINT }
    ),
    custom: {
      parse: (v) => {
        // A same-origin path names the proxy; anything else must be a URL
        if (PgCommon.isUrl(v) || v.startsWith("/")) return v;
        throw new Error(`The setting value must be a URL: ${v}`);
      },
      type: "URL",
      placeholder: "https://...",
      tip: `Make sure the endpoint runs [the playground server](${GITHUB_URL}/tree/master/server).`,
    },
  }),
];
