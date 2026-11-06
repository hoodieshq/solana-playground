import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Endpoint } from "@/constants";

import BaseNetworkChoice from "./BaseNetworkChoice";

describe("BaseNetworkChoice", () => {
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
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    expect(screen.getByRole("radiogroup", { name: "Network" })).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Devnet" }).getAttribute("aria-checked")
    ).toBe("true");
  });

  it("picks the next network with the right arrow", async () => {
    const onPick = vi.fn();
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={onPick}
        onCustom={() => {}}
      />
    );
    act(() => screen.getByRole("radio", { name: "Devnet" }).focus());
    await userEvent.keyboard("{ArrowRight}");
    expect(onPick).toHaveBeenCalledWith(Endpoint.TESTNET);
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Testnet" })
    );
  });

  it("picks nothing on a click on the network already chosen", async () => {
    const onPick = vi.fn();
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={onPick}
        onCustom={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Devnet" }));
    expect(onPick).not.toHaveBeenCalled();
  });

  it("checks Custom for an endpoint no chip lists, and says nothing of how it deploys", () => {
    render(
      <BaseNetworkChoice
        endpoint="https://my.rpc"
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    expect(
      screen.getByRole("radio", { name: "Custom" }).getAttribute("aria-checked")
    ).toBe("true");
    expect(screen.queryByText(/^Deploys with/)).toBeNull();
  });

  it("says how a deploy works on the network picked", () => {
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.TESTNET}
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    screen.getByText("Deploys with free testnet SOL");
  });

  it("asks for a URL on Custom, without switching network", async () => {
    const onPick = vi.fn();
    const onCustom = vi.fn();
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={onPick}
        onCustom={onCustom}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(onCustom).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])(
    "moves onto Custom with the arrows without asking for a URL, and asks on %s",
    async (_, key) => {
      const onPick = vi.fn();
      const onCustom = vi.fn();
      render(
        <BaseNetworkChoice
          endpoint={Endpoint.DEVNET}
          onPick={onPick}
          onCustom={onCustom}
        />
      );
      // Devnet is the first chip, so the left arrow loops onto Custom
      act(() => screen.getByRole("radio", { name: "Devnet" }).focus());
      await userEvent.keyboard("{ArrowLeft}");
      expect(document.activeElement).toBe(
        screen.getByRole("radio", { name: "Custom" })
      );
      expect(onCustom).not.toHaveBeenCalled();
      expect(onPick).not.toHaveBeenCalled();

      await userEvent.keyboard(key);
      expect(onCustom).toHaveBeenCalledTimes(1);
      expect(onPick).not.toHaveBeenCalled();
    }
  );

  it("marks Mainnet Beta's deploy line with the warning dot, since its SOL is real", () => {
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.MAINNET_BETA}
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    const line = screen.getByText("Deploys with real SOL");
    expect(
      line
        .querySelector('[data-slot="status-dot"]')
        ?.getAttribute("data-variant")
    ).toBe("warning");
  });

  it("marks a free network's deploy line with the success dot", () => {
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
    const line = screen.getByText("Deploys with free devnet SOL");
    expect(
      line
        .querySelector('[data-slot="status-dot"]')
        ?.getAttribute("data-variant")
    ).toBe("success");
  });

  it("leaves every chip unchecked for Playnet, and Tab still enters the group", async () => {
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.PLAYNET}
        onPick={() => {}}
        onCustom={() => {}}
      />
    );
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
    render(
      <BaseNetworkChoice
        endpoint="https://my.rpc"
        onPick={onPick}
        onCustom={() => {}}
      />
    );
    act(() => screen.getAllByRole("radio")[0].focus());
    expect(onPick).not.toHaveBeenCalled();
  });

  it("does not switch network when Shift+Tab lands on a chip that is not the current one", async () => {
    const onPick = vi.fn();
    render(
      <>
        <BaseNetworkChoice
          endpoint={Endpoint.DEVNET}
          onPick={onPick}
          onCustom={() => {}}
        />
        <button>after</button>
      </>
    );
    // Radix keeps the last focused chip as the group's tab stop, not the
    // checked one, so coming back lands on Testnet.
    act(() => screen.getByRole("radio", { name: "Testnet" }).focus());
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Testnet" })
    );
    expect(onPick).not.toHaveBeenCalled();
  });

  it("picks once on a click", async () => {
    const onPick = vi.fn();
    render(
      <BaseNetworkChoice
        endpoint={Endpoint.DEVNET}
        onPick={onPick}
        onCustom={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Testnet" }));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(Endpoint.TESTNET);
  });
});
