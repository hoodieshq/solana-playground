import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useOnClickOutside } from "./useOnClickOutside";

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../utils", () => ({
  PgCommon: { isNonNullish: (v: unknown) => v != null },
  PgView: {
    ids: { PORTAL_ABOVE: "portal-above", PORTAL_BELOW: "portal-below" },
  },
}));

const IGNORED = ".ignored";

const Probe = ({ cb }: { cb: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, cb, true, IGNORED);
  return <div ref={ref}>inside</div>;
};

describe("useOnClickOutside with an ignore selector", () => {
  it("does not fire for a press inside the ignored element ", () => {
    const cb = vi.fn();
    render(
      <>
        <Probe cb={cb} />
        <div className="ignored">
          <span data-testid="item">Rename</span>
        </div>
        <span data-testid="elsewhere">elsewhere</span>
      </>
    );

    fireEvent.mouseDown(screen.getByTestId("item"));
    expect(cb).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId("elsewhere"));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
