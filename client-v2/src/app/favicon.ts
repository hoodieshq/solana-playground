import faviconUrl from "./favicon.svg";

/**
 * Point the page's icon at the prototype's: the triangle-and-circle mark on
 * the brand gradient.
 *
 * Set here rather than in `index.html`, because `public/` is copied from
 * upstream's `client/public` (`scripts/update-static.mjs`) and keeps its
 * favicon. Before this runs, the tab briefly shows upstream's.
 */
export const applyFavicon = () => {
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) return;
  link.type = "image/svg+xml";
  link.href = faviconUrl;
};
