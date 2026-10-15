import { isTypingElsewhere } from "./focus";

const mount = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return host;
};

describe("isTypingElsewhere", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("is true for an input outside the editor", () => {
    const page = mount('<div id="editor"></div><input id="name" />');
    expect(
      isTypingElsewhere(
        page.querySelector("#name"),
        page.querySelector("#editor")!
      )
    ).toBe(true);
  });

  it("is false for a textarea inside the editor", () => {
    const page = mount('<div id="editor"><textarea></textarea></div>');
    expect(
      isTypingElsewhere(
        page.querySelector("textarea"),
        page.querySelector("#editor")!
      )
    ).toBe(false);
  });

  it("is false for a tree item, which takes no text", () => {
    const page = mount(
      '<div id="editor"></div><div role="treeitem" tabindex="0">lib.rs</div>'
    );
    expect(
      isTypingElsewhere(
        page.querySelector('[role="treeitem"]'),
        page.querySelector("#editor")!
      )
    ).toBe(false);
  });

  it("is false when nothing or the body has focus", () => {
    const page = mount('<div id="editor"></div>');
    const editor = page.querySelector("#editor")!;
    expect(isTypingElsewhere(null, editor)).toBe(false);
    expect(isTypingElsewhere(document.body, editor)).toBe(false);
  });

  it("is true for a contenteditable element outside the editor", () => {
    const page = mount(
      '<div id="editor"></div><div id="note" contenteditable="true"></div>'
    );
    const note = page.querySelector("#note")!;
    // jsdom does not implement isContentEditable.
    Object.defineProperty(note, "isContentEditable", { value: true });
    expect(isTypingElsewhere(note, page.querySelector("#editor")!)).toBe(true);
  });

  it("is false for a checkbox, which is not a text field", () => {
    const page = mount(
      '<div id="editor"></div><input id="box" type="checkbox" />'
    );
    expect(
      isTypingElsewhere(
        page.querySelector("#box"),
        page.querySelector("#editor")!
      )
    ).toBe(false);
  });
});
