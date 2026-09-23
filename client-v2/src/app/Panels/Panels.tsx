import { useEffect, useState } from "react";
import styled from "styled-components";

import Bottom from "./Bottom";
import Main from "./Main";
import Side from "./Side";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { PgView } from "../../utils";
import Flow from "../../views/flow";
import Landing from "../../views/landing";

const params = new URLSearchParams(window.location.search);
const useClassic = params.has("classic");

/**
 * Whether to go straight into the product rather than the landing.
 *
 * The URL is the only thing that decides. `/` is the landing, `/?app` is the
 * product, and a deep link like /tutorials goes straight in — someone who
 * asked for a page by name already knows what this is, and showing them a
 * pitch instead would be rude.
 *
 * An earlier version also remembered the choice for the tab, which meant that
 * once you had entered, `/` never showed the landing again without clearing
 * storage. Two sources of truth for one question, and the hidden one won.
 */
const showProduct = () =>
  params.has("app") || window.location.pathname !== "/";

const Panels = () => {
  const [entered, setEntered] = useState(showProduct);

  const enter = () => {
    // Push, not replace: Back from the product returns to the landing, which
    // is what a browser's Back button is for.
    window.history.pushState(null, "", "/?app");
    setEntered(true);
  };

  // ...and Back actually works, rather than leaving the URL behind the view.
  useEffect(() => {
    const onPop = () => setEntered(showProduct());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!entered && !useClassic) return <Landing onEnter={enter} />;

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
