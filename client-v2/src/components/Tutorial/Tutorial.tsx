import { FC, useCallback, useEffect } from "react";

import { useRenderOnChange } from "../../hooks";
import { PgTutorial } from "../../utils";
import type { TutorialComponentProps } from "./types";
import { About, Main } from "./views";

export const Tutorial: FC<React.PropsWithChildren<TutorialComponentProps>> = ({
  about,
  pages,
  files,
  defaultOpenFile,
  layout,
  onMount,
  onComplete,
}) => {
  useRenderOnChange(PgTutorial.onDidChange);

  const start = useCallback(
    () => PgTutorial.start({ files, defaultOpenFile }),
    [files, defaultOpenFile]
  );

  // Run the tutorial's `onMount`. React would call any value it returns as
  // the cleanup, so only a returned function is used as one.
  useEffect(() => {
    const cleanup = onMount?.();
    if (typeof cleanup === "function") return cleanup;
  }, [onMount]);

  // `current` is derived from the path, so leaving the tutorial clears it and
  // re-renders this view before the route change unmounts it.
  if (!PgTutorial.current) return null;

  const isStarted = PgTutorial.isStarted(PgTutorial.current.name);

  return (
    <div className="pg-scrollbar-all flex-1 overflow-auto opacity-0 transition-opacity duration-150 ease-linear">
      {PgTutorial.page ? (
        <Main
          pageNumber={PgTutorial.page}
          pages={pages}
          layout={layout}
          isStarted={isStarted}
          onComplete={onComplete}
          start={start}
        />
      ) : (
        <About about={about} isStarted={isStarted} start={start} />
      )}
    </div>
  );
};
