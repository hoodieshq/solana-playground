import { turnProducedApproval, type ChatItem } from "./store";

const user = (text: string): ChatItem => ({ kind: "user", id: "u", text });
const assistant = (text: string): ChatItem => ({
  kind: "assistant",
  id: "a",
  text,
});
const approval: ChatItem = {
  kind: "approval",
  id: "p",
  request: { type: "patch", path: "src/lib.rs", before: "a", after: "b" },
  status: "allowed",
};

describe("turnProducedApproval", () => {
  it("is false for a turn that only replied", () => {
    expect(turnProducedApproval([user("hi"), assistant("hello")])).toBe(false);
  });

  it("is true when this turn wrote a patch before replying", () => {
    expect(
      turnProducedApproval([
        user("write it"),
        approval,
        assistant("I added the hello instruction."),
      ])
    ).toBe(true);
  });

  it("does not look past the start of the current turn", () => {
    expect(
      turnProducedApproval([
        user("write it"),
        approval,
        assistant("done"),
        user("what does it do?"),
        assistant("it logs a message"),
      ])
    ).toBe(false);
  });

  it("is false for an empty conversation", () => {
    expect(turnProducedApproval([])).toBe(false);
  });
});
