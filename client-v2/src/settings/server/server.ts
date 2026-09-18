import { GITHUB_URL } from "../../constants";
import { PgCommon } from "../../utils";
import { createSetting } from "../create";
import {
  defaultServerEndpoint,
  LOCAL_ENDPOINT,
  SERVER_ENDPOINT_OPTIONS,
} from "./default-endpoint";

export const server = [
  createSetting({
    id: "server.endpoint",
    description: "Build server URL",
    // The list lives beside the default so the two cannot disagree about
    // which host is Solana's and which is upstream's (D30)
    values: [...SERVER_ENDPOINT_OPTIONS],
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
