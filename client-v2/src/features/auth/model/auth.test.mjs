import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

const load = async () => {
  // Fresh module per case: the auth instance is memoised at module scope
  const url = new URL("./auth.mjs", import.meta.url);
  url.searchParams.set("t", String(Math.random()));
  return import(url.href);
};

// Read before the cases clear it; the cases that sign in need a real database
const DATABASE_URL = process.env.DATABASE_URL;
const needsDatabase = DATABASE_URL ? false : "needs DATABASE_URL";

const HOST = "https://solana-playground-teal.vercel.app";
const PREVIEW_HOST = "solana-playground-abc123-hoodies.vercel.app";
const PREVIEW = `https://${PREVIEW_HOST}`;
const PROXY_SECRET = "proxy-secret-proxy-secret-proxy-secret";

/** The environment a preview deploys with: the host's URL, no base URL */
const asPreview = () => {
  process.env.VERCEL_URL = PREVIEW_HOST;
  process.env.AUTH_OAUTH_PROXY_URL = HOST;
  process.env.AUTH_OAUTH_PROXY_SECRET = PROXY_SECRET;
};

/** The environment the host deploys with: its own base URL, no proxy URL */
const asHost = () => {
  process.env.AUTH_BASE_URL = HOST;
  process.env.AUTH_OAUTH_PROXY_SECRET = PROXY_SECRET;
};

/** What `signIn.social` sends from the popup */
const signIn = (auth, origin) =>
  auth.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        provider: "github",
        callbackURL: "/api/auth-complete?nonce=n",
        disableRedirect: true,
      }),
    })
  );

describe("oauthProxyPlugins", () => {
  // Cleared before each case, not after: `yarn test-api` loads `.env`
  beforeEach(() => {
    for (const name of [
      "AUTH_BASE_URL",
      "VERCEL_URL",
      "AUTH_OAUTH_PROXY_URL",
      "AUTH_OAUTH_PROXY_SECRET",
    ]) {
      delete process.env[name];
    }
    process.env.AUTH_SECRET = "auth-secret-auth-secret-auth-secret-auth";
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    if (DATABASE_URL) process.env.DATABASE_URL = DATABASE_URL;
  });

  it("is off without the secret", async () => {
    process.env.VERCEL_URL = PREVIEW_HOST;
    process.env.AUTH_OAUTH_PROXY_URL = HOST;
    const { oauthProxyPlugins } = await load();
    assert.deepEqual(oauthProxyPlugins(), []);
  });

  it("serves the completion endpoint on a preview", async () => {
    asPreview();
    const { oauthProxyPlugins } = await load();
    const [plugin] = oauthProxyPlugins();
    assert.ok(plugin.endpoints.oAuthProxyCompletion);
  });

  // The secret sits in every preview's environment; on the host the endpoint
  // would turn a payload anyone holding it can forge into a session there
  it("drops the completion endpoints on the host", async () => {
    asHost();
    const { oauthProxyPlugins } = await load();
    const [plugin] = oauthProxyPlugins();
    assert.deepEqual(plugin.endpoints, {});
    assert.ok(plugin.hooks.before.length > 0);
  });

  it("is the host when the proxy URL names this deployment", async () => {
    asHost();
    process.env.AUTH_OAUTH_PROXY_URL = `${HOST}/`;
    const { oauthProxyPlugins } = await load();
    const [plugin] = oauthProxyPlugins();
    assert.deepEqual(plugin.endpoints, {});
  });

  it(
    "sends a preview's GitHub callback to the host",
    { skip: needsDatabase },
    async () => {
      asPreview();
      const { getAuth } = await load();
      const res = await signIn(getAuth(), PREVIEW);
      assert.equal(res.status, 200);

      const github = new URL((await res.json()).url);
      assert.equal(
        github.searchParams.get("redirect_uri"),
        `${HOST}/api/auth/callback/github`
      );
    }
  );

  it(
    "404s the completion endpoint on the host",
    { skip: needsDatabase },
    async () => {
      asHost();
      const { getAuth } = await load();
      const res = await getAuth().handler(
        new Request(
          `${HOST}/api/auth/callback/github/oauth-proxy?callbackURL=%2F&profile=x`
        )
      );
      assert.equal(res.status, 404);
    }
  );
});
