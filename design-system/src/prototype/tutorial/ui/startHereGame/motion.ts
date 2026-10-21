// The ease-out and the product's curve from the motion tokens, as values for the Web Animations API
export const EASE_OUT = "cubic-bezier(0.22, 0.61, 0.24, 1)"
export const EASE_STANDARD = "cubic-bezier(0.2, 0, 0, 1)"

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
