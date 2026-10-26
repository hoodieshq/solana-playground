export type View = "phone" | "tablet" | "desktop"

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

/** Set when a slide of the client deck embeds the prototype: `overview` opens the tutorial page,
 * a number opens that step (0 based) with the steps before it done. Nothing is saved, so every
 * slide starts where it should and a reload starts it again */
export const DECK = params.get("deck")

const asked = params.get("view")
export const view: View = asked === "desktop" || asked === "tablet" ? asked : "phone"

export function switchView(to: View) {
  const next = new URLSearchParams(location.search)
  next.delete("embed")
  if (to === "phone") next.delete("view")
  else next.set("view", to)
  next.set("keep", "1")
  location.replace(`${location.pathname}?${next}`)
}
