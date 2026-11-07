import { describe, expect, it } from "vitest";

import { isEditable } from "./is-editable";

const make = (html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host.firstElementChild as Element;
};

describe("isEditable", () => {
  it("is true for a text field and a text area", () => {
    expect(isEditable(make("<input />"))).toBe(true);
    expect(isEditable(make("<textarea></textarea>"))).toBe(true);
  });

  it("is true inside an element edited in place", () => {
    const host = make('<div contenteditable="true"><span>x</span></div>');
    expect(isEditable(host.firstElementChild)).toBe(true);
  });

  it("is false for a button, plain text and an opted-out editable", () => {
    expect(isEditable(make("<button>Go</button>"))).toBe(false);
    expect(isEditable(make("<p>text</p>"))).toBe(false);
    expect(isEditable(make('<div contenteditable="false"></div>'))).toBe(false);
  });

  it("is false for a target that is not an element", () => {
    expect(isEditable(document.createTextNode("x"))).toBe(false);
    expect(isEditable(window)).toBe(false);
  });
});
