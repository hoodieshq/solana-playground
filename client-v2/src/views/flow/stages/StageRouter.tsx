import type { FC } from "react";
import { lazy, Suspense } from "react";
import styled from "styled-components";

import Write from "./Write";
import { SpinnerWithBg } from "../../../components/Loading";
import type { Stage } from "../state/stage";

const Build = lazy(() => import("./Build"));
const Deploy = lazy(() => import("./Deploy"));
const Interact = lazy(() => import("./Interact"));

interface StageRouterProps {
  stage: Stage;
}

/**
 * Swaps in the panel for the current dev-loop stage.
 *
 * `Write` (which hosts upstream's `Primary`) stays mounted at all times and
 * is only ever hidden with CSS. `Primary`'s content is handed to it once by
 * the router through a one-shot custom event — unmounting it on every stage
 * change would leave it permanently blank the next time `Write` remounts.
 */
const StageRouter: FC<StageRouterProps> = ({ stage }) => (
  <>
    <WriteSlot $hidden={stage !== "write"}>
      <Write />
    </WriteSlot>
    <Suspense fallback={<SpinnerWithBg loading size="2rem" />}>
      {stage === "build" && <Build />}
      {stage === "deploy" && <Deploy />}
      {stage === "interact" && <Interact />}
    </Suspense>
  </>
);

export default StageRouter;

const WriteSlot = styled.div<{ $hidden: boolean }>`
  display: ${({ $hidden }) => ($hidden ? "none" : "flex")};
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;
