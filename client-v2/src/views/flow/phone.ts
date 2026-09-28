import { useEffect, useState } from "react";

/**
 * Phones, and small tablets held upright: the product shows one pane at a
 * time and the sidebar becomes a drawer. One breakpoint for the whole flow,
 * as a media query for styles and as a hook for layout that styles alone
 * cannot change.
 */
export const PHONE_QUERY = "(max-width: 720px)";
export const PHONE = `@media ${PHONE_QUERY}`;

export const usePhone = () => {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches
  );
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
};
