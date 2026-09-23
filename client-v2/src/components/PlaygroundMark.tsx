import { FC } from "react";

/**
 * The Playground mark: a play triangle running into a ring.
 *
 * One path, taken from the supplied SVG unchanged, with the fill switched to
 * `currentColor` so it takes the colour of whatever it sits in — the original
 * was filled with the page ink, which would have made it invisible on a dark
 * surface and unchangeable on a light one.
 *
 * Used by the landing's hero and by the head of the product's sidebar, which
 * is why it sits here rather than under views/landing.
 */
const PlaygroundMark: FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 342 184"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M151.072 87.2625C153.719 88.8441 157.113 86.9539 157.382 83.882C161.492 36.8739 200.954 0 249.029 0C299.839 0 341.029 41.1898 341.029 92C341.029 142.81 299.839 184 249.029 184C200.954 184 161.492 147.125 157.382 100.117C157.113 97.0452 153.719 95.155 151.072 96.7366L6.05164 183.384C3.38542 184.977 0 183.056 0 179.95V4.04951C0 0.943646 3.3854 -0.977284 6.05162 0.615731L151.072 87.2625ZM249.029 28C213.683 28 185.029 56.6538 185.029 92C185.029 127.346 213.683 156 249.029 156C284.375 156 313.029 127.346 313.029 92C313.029 56.6538 284.376 28 249.029 28Z"
      fill="currentColor"
    />
  </svg>
);

export default PlaygroundMark;
