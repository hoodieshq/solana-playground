import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// GearSidebar's store-backed imports are not under test; `NetworkChoice` is
// prop-driven.
vi.mock("../../../utils", () => ({ PgCommon: {} }));
vi.mock("../../../hooks", () => ({}));
vi.mock("../../../app/Panels/Side/Left/Settings", () => ({
  default: () => null,
}));
vi.mock("../../sidebar/explorer/Component/Modals", () => ({}));

import { NetworkChoice } from "./GearSidebar";
import { Endpoint } from "../../../constants";

describe("NetworkChoice", () => {
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

  it("is a radio group named Network with the current one checked", () => {
    render(<NetworkChoice endpoint={Endpoint.DEVNET} onPick={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Network" })).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Devnet" }).getAttribute("aria-checked")
    ).toBe("true");
  });

  it("picks the next network with the right arrow", async () => {
    const onPick = vi.fn();
    render(<NetworkChoice endpoint={Endpoint.DEVNET} onPick={onPick} />);
    screen.getByRole("radio", { name: "Devnet" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onPick).toHaveBeenCalledWith(Endpoint.TESTNET);
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Testnet" })
    );
  });

  it("leaves every chip unchecked for an endpoint it does not list, and Tab still enters the group", async () => {
    render(<NetworkChoice endpoint="https://my.rpc" onPick={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(
      radios.every((r) => r.getAttribute("aria-checked") === "false")
    ).toBe(true);
    // Radix makes the group itself the stop here and hands focus to a chip
    await userEvent.tab();
    expect(radios).toContain(document.activeElement);
  });

  it("does not switch network when focus lands on a chip of an unlisted endpoint", () => {
    const onPick = vi.fn();
    render(<NetworkChoice endpoint="https://my.rpc" onPick={onPick} />);
    screen.getAllByRole("radio")[0].focus();
    expect(onPick).not.toHaveBeenCalled();
  });
});
