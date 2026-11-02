/**
 * The accent bar along a timed toast's foot, full when it opens and empty
 * when it closes. A CSS animation over the toast's duration, not a timer of
 * its own: it pauses where Sonner pauses the toast's timer (the toasts
 * expanded under the pointer), and a hidden page stops both. Under reduced
 * motion it is not drawn, since a still bar would claim a time it does not
 * show.
 */
export const ToastProgress = ({ duration }: { duration: number }) => (
  <span
    aria-hidden="true"
    // Clipped to the toast's corners, which the bar runs into
    className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden rounded-b-[var(--border-radius)] motion-reduce:hidden"
  >
    <span
      data-slot="toast-progress"
      className="block h-full origin-left animate-[pg-toast-progress_linear_forwards] bg-primary in-data-[expanded=true]:[animation-play-state:paused]"
      style={{ animationDuration: `${duration}ms` }}
    />
  </span>
);
