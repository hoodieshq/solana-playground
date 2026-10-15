import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BaseEditorTab } from "./BaseEditorTab";

const setup = (current: boolean, menuOpen = false) => {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <BaseEditorTab
      path="/src/lib.rs"
      name="lib.rs"
      icon={<svg aria-hidden />}
      current={current}
      menuOpen={menuOpen}
      onSelect={onSelect}
      onClose={onClose}
      role="button"
    />
  );
  return { onSelect, onClose };
};

describe("BaseEditorTab", () => {
  it("renders a tab with the file name", () => {
    setup(false);
    expect(screen.getByRole("tab", { name: "lib.rs" })).toBeTruthy();
  });

  it("takes aria-selected from current", () => {
    setup(true);
    expect(
      screen.getByRole("tab", { name: "lib.rs" }).getAttribute("aria-selected")
    ).toBe("true");
  });

  it("keeps id and title as the path and the passed role", () => {
    setup(false);
    const root = screen.getByTitle("/src/lib.rs");
    expect(root.id).toBe("/src/lib.rs");
    expect(root.getAttribute("role")).toBe("button");
  });

  it("selects on a click on the tab", () => {
    const { onSelect, onClose } = setup(false);
    fireEvent.click(screen.getByRole("tab"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without selecting on a click on close", () => {
    const { onSelect, onClose } = setup(false);
    fireEvent.click(screen.getByRole("button", { name: "Close lib.rs" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("marks an open menu", () => {
    setup(false, true);
    expect(
      screen.getByTitle("/src/lib.rs").hasAttribute("data-menu-open")
    ).toBe(true);
  });
});
