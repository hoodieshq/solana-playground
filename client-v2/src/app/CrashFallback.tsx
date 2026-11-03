type CrashFallbackProps = {
  /** What the button does; the page's own reload unless a test passes one */
  reload?: () => void;
};

/**
 * What the app shows when a render throws past every boundary: Spec 08's
 * fallback (ANY-00) for the whole app. Nothing is left on screen to retry
 * from, so it offers a reload. Plain elements, because the boundary that
 * shows it sits outside every provider, the theme's included.
 */
export const CrashFallback = ({
  reload = () => window.location.reload(),
}: CrashFallbackProps) => (
  <div role="alert">
    <p>Playground stopped for a reason we can&apos;t name. Reload the page.</p>
    <button type="button" onClick={reload}>
      Reload
    </button>
  </div>
);
