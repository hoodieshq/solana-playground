import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import BaseShareButton from "./BaseShareButton";

it("names the project it shares, says Share, and calls back on a click", () => {
  const onShare = vi.fn();
  render(<BaseShareButton name="counter" onShare={onShare} />);

  const share = screen.getByRole("button", { name: "Share counter" });
  expect(share.id).toBe("flow-share");
  expect(share.textContent).toBe("Share");
  expect(share.querySelector("svg")).toBeTruthy();
  fireEvent.click(share);

  expect(onShare).toHaveBeenCalledTimes(1);
});
