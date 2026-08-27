// Only `PgTutorial` is mocked -- `useRenderOnChange` (from `../../../hooks`)
// is the real hook, so this test exercises the actual subscription, not a
// stand-in for it. `SpinnerWithBg` and `LessonSurface` are replaced with
// markers: the former needs a styled-components theme this test does not
// set up, and the latter renders the real editor, which is its own concern.
jest.mock("../../../utils", () => ({
  PgTutorial: {
    isStarted: jest.fn(),
    onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
  },
}));

jest.mock("../../../components/Loading", () => ({
  SpinnerWithBg: () => null,
}));

jest.mock("./LessonSurface", () => ({
  __esModule: true,
  default: () => <div data-testid="lesson-surface" />,
}));

import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";

import LessonRoute from "./LessonRoute";
import { PgTutorial } from "../../../utils";
import type { TutorialData } from "../../../utils";

const isStarted = PgTutorial.isStarted as jest.Mock;
const onDidChange = PgTutorial.onDidChange as unknown as jest.Mock;

/** Stands in for whatever `tutorial.importComponent()` resolves to. */
const UpstreamMarker = (): JSX.Element => (
  <div data-testid="upstream-tutorial" />
);

const makeTutorial = (): TutorialData => ({
  name: "Test Tutorial",
  description: "A test tutorial",
  authors: [{ name: "Test Author" }],
  level: "Beginner",
  thumbnail: "/thumb.png",
  pageCount: 1,
  unixTimestamp: 0,
  importComponent: () => Promise.resolve({ default: UpstreamMarker }),
});

/** Lets pending microtasks (the mocked `importComponent()` promise and
 * `React.lazy`'s own `.then` chain) fully settle before assertions run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("LessonRoute", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    isStarted.mockReset();
    onDidChange.mockReset().mockReturnValue({ dispose: jest.fn() });
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
  });

  it("renders upstream's component when the tutorial has not been started", async () => {
    isStarted.mockReturnValue(false);

    await act(async () => {
      ReactDOM.render(<LessonRoute tutorial={makeTutorial()} />, container);
      await flush();
    });

    expect(
      container.querySelector('[data-testid="upstream-tutorial"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="lesson-surface"]')
    ).toBeNull();
  });

  it("renders the editor-only lesson surface once the tutorial is started", async () => {
    isStarted.mockReturnValue(true);

    await act(async () => {
      ReactDOM.render(<LessonRoute tutorial={makeTutorial()} />, container);
      await flush();
    });

    expect(
      container.querySelector('[data-testid="lesson-surface"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="upstream-tutorial"]')
    ).toBeNull();
  });

  it("switches to the lesson surface when PgTutorial.onDidChange fires, with no remount", async () => {
    isStarted.mockReturnValue(false);

    await act(async () => {
      ReactDOM.render(<LessonRoute tutorial={makeTutorial()} />, container);
      await flush();
    });
    expect(
      container.querySelector('[data-testid="upstream-tutorial"]')
    ).not.toBeNull();

    // The one call `useRenderOnChange` made to subscribe -- its argument is
    // the callback `PgTutorial.update(...)` (inside the real `start()`)
    // would invoke once the workspace has been created.
    expect(onDidChange).toHaveBeenCalledTimes(1);
    const notifyChange = onDidChange.mock.calls[0][0];

    isStarted.mockReturnValue(true);
    await act(async () => {
      notifyChange();
      await flush();
    });

    expect(
      container.querySelector('[data-testid="lesson-surface"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="upstream-tutorial"]')
    ).toBeNull();
    // Only ever subscribed once -- the transition is `LessonRoute`
    // re-rendering in place, not a remount that would re-subscribe.
    expect(onDidChange).toHaveBeenCalledTimes(1);
  });
});
