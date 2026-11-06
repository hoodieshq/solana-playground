// A second file: its env mock gives every test here a platform devnet, which
// BaseNetworkChoice.test.tsx must not see
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Endpoint } from "@/constants";

import BaseNetworkChoice from "./BaseNetworkChoice";

vi.mock("@/shared/config/client-env", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/shared/config/client-env")
  >();
  return Object.assign({}, original, {
    PLATFORM_RPC_URLS: { devnet: "https://devnet.platform.test" },
  });
});

describe("BaseNetworkChoice with a platform devnet", () => {
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

  it("offers the platform devnet in place of the public one", () => {
    render(
      <BaseNetworkChoice
        endpoint="https://devnet.platform.test"
        onPick={() => {}}
      />
    );

    expect(
      screen.getAllByRole("radio").map((r) => r.textContent?.trim())
    ).toEqual(["Devnet", "Mainnet"]);
    expect(
      screen.getByRole("radio", { name: "Devnet" }).getAttribute("aria-checked")
    ).toBe("true");
  });

  it("lists no chip for the public devnet", () => {
    render(<BaseNetworkChoice endpoint={Endpoint.DEVNET} onPick={() => {}} />);

    expect(
      screen
        .getAllByRole("radio")
        .some((r) => r.getAttribute("aria-checked") === "true")
    ).toBe(false);
  });
});
