import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The connection as the section reads and writes it; nothing else of `@/utils`
const connection = vi.hoisted(() => ({ endpoint: "" }));
vi.mock("@/utils", () => ({
  PgSettings: {
    connection,
    onDidChangeConnectionEndpoint: () => ({ dispose: () => {} }),
  },
  PgView: { setToast: () => {}, closeToast: () => {} },
}));
vi.mock("@/hooks", () => ({ useRenderOnChange: () => {} }));

import NetworkSection from "./NetworkSection";

const DEVNET = "https://api.devnet.solana.com/";

/** Every health request answers, or none does */
const rpcAnswers = (answers: boolean) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      answers
        ? new Response('{"result":"ok"}')
        : Promise.reject(new TypeError("Failed to fetch"))
    );

const addRpc = async (name: string, url: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Add custom RPC" }));
  await userEvent.type(screen.getByLabelText("Name"), name);
  await userEvent.type(screen.getByLabelText("RPC URL"), `${url}{Enter}`);
};

describe("NetworkSection", () => {
  beforeEach(() => {
    // the chips measure themselves with one; jsdom has none
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    localStorage.clear();
    connection.endpoint = DEVNET;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("picks a new RPC whose URL answers", async () => {
    rpcAnswers(true);
    render(<NetworkSection />);
    await addRpc("Triton", "https://t.test");
    // Its chip and its row in the list
    expect(await screen.findByRole("radio", { name: "Triton" })).toBeTruthy();
    expect(connection.endpoint).toBe("https://t.test/");
  });

  it("picks a new RPC saved through Use anyway, and not before", async () => {
    rpcAnswers(false);
    render(<NetworkSection />);
    await addRpc("Dead", "https://dead.test");
    await screen.findByText("This URL is not responding.");
    expect(connection.endpoint).toBe(DEVNET);
    await userEvent.click(screen.getByRole("button", { name: "Use anyway" }));
    expect(connection.endpoint).toBe("https://dead.test/");
  });

  it("moves the connection with an edit of the RPC in use, through Use anyway", async () => {
    localStorage.setItem(
      "customRpcs",
      JSON.stringify([{ name: "Mine", url: "https://mine.test/" }])
    );
    connection.endpoint = "https://mine.test/";
    rpcAnswers(false);
    render(<NetworkSection />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Mine" }));
    await userEvent.clear(screen.getByLabelText("RPC URL"));
    await userEvent.type(
      screen.getByLabelText("RPC URL"),
      "https://mine2.test{Enter}"
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Use anyway" })
    );
    expect(connection.endpoint).toBe("https://mine2.test/");
  });
});
