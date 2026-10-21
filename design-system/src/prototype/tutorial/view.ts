export type View = "phone" | "desktop"

const params = new URLSearchParams(location.search)

/** Set when the page was opened by switching views: the store then reopens the screen it was on
 * instead of the gallery. It's read once and dropped from the address, so a reload still starts
 * from the gallery */
export const KEEP = params.has("keep")
if (KEEP) {
  params.delete("keep")
  const query = params.toString()
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`)
}

export const view: View = params.get("view") === "desktop" ? "desktop" : "phone"

export function switchView(to: View) {
  const next = new URLSearchParams(location.search)
  next.delete("embed")
  if (to === "desktop") next.set("view", "desktop")
  else next.delete("view")
  next.set("keep", "1")
  location.assign(`${location.pathname}?${next}`)
}
