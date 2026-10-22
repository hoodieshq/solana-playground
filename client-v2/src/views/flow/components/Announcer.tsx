import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgLesson } from "../lessons/store";
import { currentStep, stepNumber } from "../lessons/progress";

/**
 * What a screen reader says when the loop moves on its own.
 *
 * A build, a deploy and a step being proved all change the screen without
 * the learner pressing anything at that moment: the card turns red, the band
 * moves to the next step. Someone listening rather than looking heard none of
 * it. This is one polite line, out of sight, that says each change once, in
 * the words the band and the stages use. The chat already speaks for itself
 * (it is a `log`).
 */
const Announcer = () => {
  const [line, setLine] = useState("");
  const flowWas = useRef<FlowState>(PgFlow.state);
  const stepWas = useRef<string | null>(null);

  useEffect(() => {
    const say = (text: string) => {
      // The same words twice in a row are still a new event
      setLine("");
      window.requestAnimationFrame(() => setLine(text));
    };

    const flow = PgFlow.onDidChange((next) => {
      const was = flowWas.current;
      flowWas.current = next;
      if (was.build !== next.build) {
        if (next.build === "running") say("Building…");
        else if (next.build === "failed") {
          const n = next.buildErrorCount;
          say(`Build failed, ${n} ${n === 1 ? "error" : "errors"}.`);
        } else if (next.build === "done" && was.build === "running") {
          say("Build succeeded.");
        }
      }
      if (was.deploy !== next.deploy) {
        if (next.deploy === "running") say("Deploying to devnet…");
        else if (next.deploy === "done") say("Deployed to devnet.");
        else if (next.deploy === "failed") say("Deploy failed.");
      }
    });

    const lesson = PgLesson.onDidChange((state) => {
      if (!state.path) {
        stepWas.current = null;
        return;
      }
      const step = currentStep(state.path, state.progress);
      const id = step?.id ?? "finished";
      if (stepWas.current === id) return;
      const first = stepWas.current === null;
      stepWas.current = id;
      // Opening a lesson is not news; moving through it is
      if (first) return;
      if (!step) say("Tutorial complete.");
      else {
        const n = stepNumber(state.path, state.progress);
        say(
          `Step ${n} of ${state.path.steps.length}: ${step.objective}.`
        );
      }
    });

    return () => {
      flow.dispose();
      lesson.dispose();
    };
  }, []);

  return (
    <Line role="status" aria-live="polite" aria-atomic="true">
      {line}
    </Line>
  );
};

export default Announcer;

const Line = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;
