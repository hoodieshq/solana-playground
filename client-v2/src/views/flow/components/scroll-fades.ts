import type { Disposable } from "../../../utils";

const STYLE_ID = "pg-scroll-fades";

/* No scrollbar anywhere, so the rule wins over the ones parts set for their
   own bars (the terminal's, the theme's): an edge that fades says there is more past it,
   instead of a bar beside it. The fade is a mask, so it works on any ground,
   and each edge only fades while there is content past it. */
const CSS = `
* { scrollbar-width: none !important; }
*::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }

[data-fade] {
  --pg-fade: 2.5rem;
  --pg-fade-top: #000;
  --pg-fade-bottom: #000;
  --pg-fade-left: #000;
  --pg-fade-right: #000;
  -webkit-mask-image:
    linear-gradient(to bottom, var(--pg-fade-top), #000 var(--pg-fade), #000 calc(100% - var(--pg-fade)), var(--pg-fade-bottom)),
    linear-gradient(to right, var(--pg-fade-left), #000 var(--pg-fade), #000 calc(100% - var(--pg-fade)), var(--pg-fade-right));
  mask-image:
    linear-gradient(to bottom, var(--pg-fade-top), #000 var(--pg-fade), #000 calc(100% - var(--pg-fade)), var(--pg-fade-bottom)),
    linear-gradient(to right, var(--pg-fade-left), #000 var(--pg-fade), #000 calc(100% - var(--pg-fade)), var(--pg-fade-right));
  -webkit-mask-composite: source-in;
  mask-composite: intersect;
}
[data-fade~="top"] { --pg-fade-top: transparent; }
[data-fade~="bottom"] { --pg-fade-bottom: transparent; }
[data-fade~="left"] { --pg-fade-left: transparent; }
[data-fade~="right"] { --pg-fade-right: transparent; }
`;

/** How far from an edge still counts as at it, for subpixel scroll offsets */
const SLACK = 2;

/* Scrollers that keep their own way of showing it: the editor and the
   terminal draw their own, and a pager snapping between whole pages has no
   edge to hint at */
const SKIP = ".monaco-editor, .xterm";

const scrolls = (value: string) => value === "auto" || value === "scroll";

/** The edges of `el` with content past them, as `data-fade` words */
const edgesOf = (el: HTMLElement) => {
  const style = getComputedStyle(el);
  if (style.scrollSnapType !== "none") return "";
  const edges: string[] = [];
  if (scrolls(style.overflowY) && el.scrollHeight - el.clientHeight > SLACK) {
    if (el.scrollTop > SLACK) edges.push("top");
    if (el.scrollHeight - el.clientHeight - el.scrollTop > SLACK)
      edges.push("bottom");
  }
  if (scrolls(style.overflowX) && el.scrollWidth - el.clientWidth > SLACK) {
    if (el.scrollLeft > SLACK) edges.push("left");
    if (el.scrollWidth - el.clientWidth - el.scrollLeft > SLACK)
      edges.push("right");
  }
  return edges.join(" ");
};

const mark = (el: HTMLElement) => {
  const edges = edgesOf(el);
  if (edges) {
    if (el.dataset.fade !== edges) el.dataset.fade = edges;
  } else if (el.dataset.fade !== undefined) {
    delete el.dataset.fade;
  }
};

/**
 * Hide every scrollbar in the product and fade the edges that have more
 * past them.
 *
 * Scrollers are found by their computed overflow, once the page settles
 * after a change, and re-marked as they scroll or resize. Only the elements
 * that can scroll are kept watching, so a long page costs one pass per
 * burst of changes, not one per element per frame.
 */
export const initScrollFades = (): Disposable => {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const watched = new Set<HTMLElement>();
  const resize = new ResizeObserver((entries) =>
    entries.forEach((e) => mark(e.target as HTMLElement))
  );

  let queued = 0;
  const scan = () => {
    queued = 0;
    for (const el of watched) {
      if (!el.isConnected) {
        watched.delete(el);
        resize.unobserve(el);
      }
    }
    document.body.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.closest(SKIP)) return;
      const style = getComputedStyle(el);
      if (!scrolls(style.overflowY) && !scrolls(style.overflowX)) return;
      if (!watched.has(el)) {
        watched.add(el);
        resize.observe(el);
      }
      mark(el);
    });
    // Content that grew inside a scroller changes its edges, not its size
    watched.forEach(mark);
  };
  const queue = () => {
    if (!queued) queued = window.setTimeout(scan, 150);
  };

  const onScroll = (e: Event) => {
    const el = e.target;
    if (el instanceof HTMLElement && watched.has(el)) mark(el);
  };
  document.addEventListener("scroll", onScroll, {
    capture: true,
    passive: true,
  });
  // Typing in the editor and output in the terminal change the page all the
  // time and never a scroller of ours, so they wake nothing
  const mutations = new MutationObserver((records) => {
    const ours = records.some((r) => {
      const at =
        r.target instanceof Element ? r.target : r.target.parentElement;
      return !at?.closest(SKIP);
    });
    if (ours) queue();
  });
  mutations.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  scan();

  return {
    dispose: () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      mutations.disconnect();
      resize.disconnect();
      window.clearTimeout(queued);
      watched.forEach((el) => delete el.dataset.fade);
      document.getElementById(STYLE_ID)?.remove();
    },
  };
};
