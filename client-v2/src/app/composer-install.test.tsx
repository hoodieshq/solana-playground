import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Composer,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
} from "@/shared/ui/composer";

describe("composer: a controlled value", () => {
  it("enables Send for a value set by the product, not typed", () => {
    render(
      <Composer>
        <ComposerInput value="Why did my build fail?" onChange={() => {}} />
        <ComposerToolbar>
          <ComposerSend>Send</ComposerSend>
        </ComposerToolbar>
      </Composer>
    );
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty(
      "disabled",
      false
    );
  });

  it("disables Send again when the value is cleared", () => {
    const { rerender } = render(
      <Composer>
        <ComposerInput value="x" onChange={() => {}} />
        <ComposerSend />
      </Composer>
    );
    rerender(
      <Composer>
        <ComposerInput value="" onChange={() => {}} />
        <ComposerSend />
      </Composer>
    );
    expect(screen.getByRole("button", { name: "Send" })).toHaveProperty(
      "disabled",
      true
    );
  });
});
