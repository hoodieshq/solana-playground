import { useEffect, useState } from "react";
import styled from "styled-components";

import Bottom from "./Bottom";
import Main from "./Main";
import Side from "./Side";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { PgView } from "../../utils";
import Deck from "../../views/deck";
import Evaluation from "../../views/evaluation";
import Flow from "../../views/flow";
import Landing from "../../views/landing";

const params = new URLSearchParams(window.location.search);
const useClassic = params.has("classic");

/**
 * Which of the four things the URL is asking for.
 *
 * The URL is the only thing that decides, and it decides on every pop — an
 * earlier version also remembered the choice for the tab, which meant `/`
 * never showed the landing again without clearing storage. Two sources of
 * truth for one question, and the hidden one won.
 *
 * A deep link like /tutorials goes straight into the product: someone who
 * asked for a page by name already knows what this is, and showing them a
 * pitch instead would be rude.
 */
type Stage = "deck" | "landing" | "evaluation" | "product";

const stageFromUrl = (): Stage => {
  if (window.location.pathname !== "/") return "product";

  /* Hash first, query second. `?app` is this codebase's existing convention
     and still works, but a full page load does not always keep a query string
     — behind a rewriting proxy it arrives stripped, which turned every plain
     link into a trip back to the first slide. A hash survives that, so it is
     what gets written. */
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#/, "");
  const asked = (key: string) => hash === key || search.has(key);

  if (asked("app")) return "product";
  if (asked("evaluation")) return "evaluation";
  if (asked("landing")) return "landing";
  return "deck";
};

const Panels = () => {
  const [stage, setStage] = useState<Stage>(stageFromUrl);

  /* Push, not replace, at every step: Back walks the presentation in reverse,
     which is what a browser's Back button is for and what someone presenting
     will reach for when they overshoot. */
  const goTo = (next: Stage, url: string) => {
    window.history.pushState(null, "", url);
    setStage(next);
  };

  useEffect(() => {
    const sync = () => setStage(stageFromUrl());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  if (!useClassic) {
    if (stage === "deck") {
      return (
        <Deck
          onLanding={() => goTo("landing", "/#landing")}
          onProduct={() => goTo("product", "/#app")}
          onEvaluation={() => goTo("evaluation", "/#evaluation")}
        />
      );
    }
    if (stage === "landing") {
      return <Landing onEnter={() => goTo("product", "/#app")} />;
    }
    if (stage === "evaluation") {
      return (
        <Evaluation
          onBack={() => window.history.back()}
          onProduct={() => goTo("product", "/#app")}
        />
      );
    }
  }

  return useClassic ? (
    <Wrapper>
      <TopWrapper>
        <Side />
        <Main />
      </TopWrapper>

      <Bottom />

      <Wallet />

      {/* A portal that is *above* the modal backdrop stacking context */}
      <PortalAbove id={PgView.ids.PORTAL_ABOVE} />

      <StyledModalBackdrop />

      {/* A portal that is *below* the modal backdrop stacking context */}
      <PortalBelow id={PgView.ids.PORTAL_BELOW}>
        <Toast />
      </PortalBelow>
    </Wrapper>
  ) : (
    <Flow />
  );
};

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const TopWrapper = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  overflow: hidden;
  width: 100%;
  flex: 1;
`;

const PortalAbove = styled.div`
  z-index: 4;
`;

const StyledModalBackdrop = styled(ModalBackdrop)`
  z-index: 3;
`;

const PortalBelow = styled.div`
  z-index: 2;
`;

export default Panels;
