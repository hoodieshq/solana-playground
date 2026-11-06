import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BaseNetworkChoice from "./BaseNetworkChoice";

// Its own file: the platform chips this mock adds would move every other
// chip test in BaseNetworkChoice.test.tsx
vi.mock("@/constants", async (importActual) => {
  const actual = await importActual<typeof import("@/constants")>();
  return {
    Endpoint: actual.Endpoint,
    PLATFORM_ENDPOINTS: [
      {
        name: "Mainnet Beta (Platform)",
        value: "https://mainnet.platform.test",
        cluster: "mainnet-beta",
      },
      {
        name: "Devnet (Platform)",
        value: "https://devnet.platform.test",
        cluster: "devnet",
      },
    ],
  };
});

const lineDot = (text: string) =>
  screen
    .getByText(text)
    .querySelector('[data-slot="status-dot"]')
    ?.getAttribute("data-variant");

describe("BaseNetworkChoice with the platform's endpoints", () => {
  beforeEach(() => {
    // the group measures its chips with one; jsdom has none
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  it("warns that the platform's mainnet deploys with real SOL", () => {
    render(
      <BaseNetworkChoice
        endpoint="https://mainnet.platform.test"
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    expect(lineDot("Deploys with real SOL")).toBe("warning");
  });

  it("says the platform's devnet deploys with free devnet SOL", () => {
    render(
      <BaseNetworkChoice
        endpoint="https://devnet.platform.test"
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    expect(lineDot("Deploys with free devnet SOL")).toBe("success");
  });
});
