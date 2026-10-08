import { PgTheme, PgView, removedThemeMessage } from "../../utils";

/**
 * Tell a user whose saved theme was removed that they are on Dark now.
 * Effects run after the panels mount, so `Toast` is listening by then.
 */
export const themeNotice = () => {
  const removed = PgTheme.takeRemovedThemeNotice();
  if (removed) {
    PgView.setToast(() => <span>{removedThemeMessage(removed)}</span>);
  }
  return { dispose: () => {} };
};
