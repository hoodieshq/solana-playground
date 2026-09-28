import type { FC } from "react";
import { lazy, Suspense } from "react";
import styled from "styled-components";

import { SpinnerWithBg } from "../../../components/Loading";
import type { Stage } from "../state/stage";

const Build = lazy(() => import("./Build"));
const Deploy = lazy(() => import("./Deploy"));
const Interact = lazy(() => import("./Interact"));

/** The stages that show what the code has become, rather than the code */
export type PreviewStage = Exclude<Stage, "write">;

interface StagePreviewProps {
  stage: PreviewStage;
}

/**
 * Build, Deploy and Interact without Write: a phone's preview page, beside
 * the page that holds the code. `StageRouter` keeps `Write` mounted for the
 * editor's sake, and the editor can only live in one place, so the preview
 * has a router of its own for the other three. Each remounts on the switch,
 * as `StageRouter`'s do, and rises in.
 */
const StagePreview: FC<StagePreviewProps> = ({ stage }) => (
  <Suspense fallback={<SpinnerWithBg loading size="2rem" />}>
    <Fade key={stage} role="tabpanel" aria-label={stage}>
      {stage === "build" && <Build />}
      {stage === "deploy" && <Deploy />}
      {stage === "interact" && <Interact />}
    </Fade>
  </Suspense>
);

export default StagePreview;

const Fade = styled.div`
  animation: rise 220ms cubic-bezier(0.2, 0, 0, 1);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;

  & > * {
    flex: 1;
    min-height: 0;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
