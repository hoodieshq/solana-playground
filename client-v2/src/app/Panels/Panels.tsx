import { useState } from "react";
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
 * The landing is what a first visit gets, and only at the root: a link to
 * /tutorials or /programs is someone who already knows what this is, and
 * showing them a pitch instead of the thing they asked for would be rude.
 * `?app` is the way in, so the product stays linkable, and the choice sticks
 * for the tab so a reload does not send a working session back to the pitch.
 */
const ENTERED = "pg-entered";
const enteredAlready = () => {
  if (params.has("app")) return true;
  if (window.location.pathname !== "/") return true;
  try {
    return sessionStorage.getItem(ENTERED) === "1";
  } catch {
    return false;
  }
};

const Panels = () => {
  const [entered, setEntered] = useState(enteredAlready);

  const enter = () => {
    try {
      sessionStorage.setItem(ENTERED, "1");
    } catch {}
    // Replace rather than push: Back should leave the site, not bounce
    // between the pitch and the product.
    window.history.replaceState(null, "", "/?app");
    setEntered(true);
  };

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
