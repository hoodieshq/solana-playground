import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CustomRpcSaveAnswer } from "../model/save-custom-rpc";
import BaseCustomRpcs from "./BaseCustomRpcs";

const HELIUS = { name: "Helius", url: "https://h.test/?api-key=s3cr3t" };

const ok = async (): Promise<CustomRpcSaveAnswer> => ({ ok: true });

/** A save the test settles by hand, to look at the form while it is checked */
const pendingSave = () => {
  let settle: (answer: CustomRpcSaveAnswer) => void = () => {
    throw new Error("the save was never sent");
  };
  const onSave = vi.fn(
    () =>
      new Promise<CustomRpcSaveAnswer>((resolve) => {
        settle = resolve;
      })
  );
  return { onSave, settle: (answer: CustomRpcSaveAnswer) => settle(answer) };
};

const openAddForm = async (url: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Add custom RPC" }));
  await userEvent.type(screen.getByLabelText("RPC URL"), url);
};

const renderList = (
  props: Partial<React.ComponentProps<typeof BaseCustomRpcs>>
) => {
  const onAdd = props.onAdd ?? vi.fn(ok);
  const onEdit = props.onEdit ?? vi.fn(ok);
  const onRemove = props.onRemove ?? vi.fn();
  render(
    <BaseCustomRpcs
      rpcs={props.rpcs ?? [HELIUS]}
      onAdd={onAdd}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  );
  return { onAdd, onEdit, onRemove };
};

describe("BaseCustomRpcs", () => {
  it("lists each saved RPC by name and host, never the key in its URL", () => {
    renderList({});
    const list = screen.getByRole("list", { name: "Custom RPCs" });
    expect(within(list).getByText("Helius")).toBeTruthy();
    expect(within(list).getByText("h.test")).toBeTruthy();
    expect(document.body.textContent).not.toContain("s3cr3t");
  });

  it("shows no list while nothing is saved", () => {
    renderList({ rpcs: [] });
    expect(screen.queryByRole("list", { name: "Custom RPCs" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add custom RPC" })).toBeTruthy();
  });

  it("adds through the form, Enter in the URL field saving it", async () => {
    const { onAdd } = renderList({ rpcs: [] });
    await userEvent.click(
      screen.getByRole("button", { name: "Add custom RPC" })
    );
    expect(
      screen.getByText("Any Solana RPC URL. It stays in this browser.")
    ).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Name"), "Triton");
    await userEvent.type(
      screen.getByLabelText("RPC URL"),
      "https://t.test{Enter}"
    );
    expect(onAdd).toHaveBeenCalledWith({
      name: "Triton",
      url: "https://t.test",
    });
    // Saved: the form closes
    expect(screen.queryByLabelText("RPC URL")).toBeNull();
  });

  it("shows a refusal under the field and keeps what was typed", async () => {
    const onAdd = vi.fn(async () => ({
      ok: false as const,
      error:
        "Enter a URL that starts with https://, or http:// for a local validator.",
    }));
    renderList({ rpcs: [], onAdd });
    await userEvent.click(
      screen.getByRole("button", { name: "Add custom RPC" })
    );
    await userEvent.type(screen.getByLabelText("RPC URL"), "devnet");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText(
        "Enter a URL that starts with https://, or http:// for a local validator."
      )
    ).toBeTruthy();
    expect((screen.getByLabelText("RPC URL") as HTMLInputElement).value).toBe(
      "devnet"
    );
  });

  it("edits a saved RPC with the form filled in, full URL included", async () => {
    const { onEdit } = renderList({});
    await userEvent.click(screen.getByRole("button", { name: "Edit Helius" }));
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "Helius"
    );
    const url = screen.getByLabelText("RPC URL") as HTMLInputElement;
    expect(url.value).toBe(HELIUS.url);
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.type(screen.getByLabelText("Name"), "Mine{Enter}");
    expect(onEdit).toHaveBeenCalledWith(HELIUS, {
      name: "Mine",
      url: HELIUS.url,
    });
  });

  it("closes the form on Cancel and saves nothing", async () => {
    const { onAdd, onEdit } = renderList({});
    await userEvent.click(
      screen.getByRole("button", { name: "Add custom RPC" })
    );
    await userEvent.type(screen.getByLabelText("RPC URL"), "https://x.test");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("RPC URL")).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("shows a spinner in Save and locks the form while the URL is checked", async () => {
    const { onSave, settle } = pendingSave();
    renderList({ rpcs: [], onAdd: onSave });
    await openAddForm("https://t.test");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const save = screen.getByRole("button", { name: /Save/ });
    expect(within(save).getByRole("status")).toBeTruthy();
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByLabelText("RPC URL") as HTMLInputElement).readOnly
    ).toBe(true);
    expect((screen.getByLabelText("Name") as HTMLInputElement).readOnly).toBe(
      true
    );
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    // Enter again while checking sends nothing more
    await userEvent.type(screen.getByLabelText("RPC URL"), "{Enter}");
    expect(onSave).toHaveBeenCalledTimes(1);
    await act(async () => settle({ ok: true }));
    expect(screen.queryByLabelText("RPC URL")).toBeNull();
  });

  it("offers Use anyway for a URL that is not responding, and saves through it", async () => {
    const { onSave, settle } = pendingSave();
    const useAnyway = vi.fn((): CustomRpcSaveAnswer => ({ ok: true }));
    renderList({ rpcs: [], onAdd: onSave });
    await openAddForm("https://example.invalid");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await act(async () =>
      settle({ ok: false, error: "This URL is not responding.", useAnyway })
    );
    expect(screen.getByText("This URL is not responding.")).toBeTruthy();
    const url = screen.getByLabelText("RPC URL") as HTMLInputElement;
    expect(url.readOnly).toBe(false);
    expect(url.getAttribute("aria-invalid")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Use anyway" }));
    expect(useAnyway).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("RPC URL")).toBeNull();
  });

  it("clears the line and Use anyway once the URL changes", async () => {
    const onAdd = vi.fn(
      async (): Promise<CustomRpcSaveAnswer> => ({
        ok: false,
        error: "You're offline, so this URL can't be checked.",
        useAnyway: () => ({ ok: true }),
      })
    );
    renderList({ rpcs: [], onAdd });
    await openAddForm("https://t.test{Enter}");
    expect(
      screen.getByText("You're offline, so this URL can't be checked.")
    ).toBeTruthy();
    await userEvent.type(screen.getByLabelText("RPC URL"), "x");
    expect(
      screen.queryByText("You're offline, so this URL can't be checked.")
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Use anyway" })).toBeNull();
  });

  it("shows a refusal from Use anyway in place of the line", async () => {
    const onAdd = vi.fn(
      async (): Promise<CustomRpcSaveAnswer> => ({
        ok: false,
        error: "This URL is not responding.",
        useAnyway: () => ({ ok: false, error: "Already saved as Elsewhere." }),
      })
    );
    renderList({ rpcs: [], onAdd });
    await openAddForm("https://t.test{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Use anyway" }));
    expect(screen.getByText("Already saved as Elsewhere.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Use anyway" })).toBeNull();
  });

  it("removes a saved RPC from its row", async () => {
    const { onRemove } = renderList({});
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Helius" })
    );
    expect(onRemove).toHaveBeenCalledWith(HELIUS);
  });
});
