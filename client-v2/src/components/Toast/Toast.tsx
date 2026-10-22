import { useCallback } from "react";
import styled, { css } from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

import { PgCommon, PgTheme, PgView } from "../../utils";
import { useSetStatic } from "../../hooks";
import { PHONE } from "../../views/flow/phone";

export interface ToastChildProps {
  id: number;
}

const Toast = () => {
  const setToast = useCallback(({ elementable, props }) => {
    const id = PgCommon.generateRandomInt(0, 2 ** 12);
    elementable = PgView.normalizeElement(elementable, {
      ...props?.componentProps,
      id,
    });
    toast(elementable, { ...props?.options, toastId: id });
  }, []);

  useSetStatic(PgView.events.TOAST_SET, setToast);
  useSetStatic(PgView.events.TOAST_CLOSE, toast.dismiss);

  return (
    <StyledContainer
      position={toast.POSITION.BOTTOM_LEFT}
      closeOnClick={false}
    />
  );
};

const StyledContainer = styled(ToastContainer)`
  ${({ theme }) => css`
    &&&.Toastify__toast-container {
      left: ${theme.views.sidebar.left.default.width};
    }

    /* On a phone there is no sidebar to clear: the toast spans the screen
       inside its gutters, and floats above the step's bar at the foot so it
       never covers what you press. The head above stays clear too. */
    ${PHONE} {
      &&&.Toastify__toast-container {
        left: 0.75rem;
        right: 0.75rem;
        bottom: calc(7.75rem + env(safe-area-inset-bottom, 0px));
        width: auto;
        padding: 0;
        transform: none;
      }

      .Toastify__toast {
        margin-bottom: 0.5rem;
        border-radius: 12px;
      }
    }

    .Toastify__toast {
      ${PgTheme.convertToCSS(theme.components.toast.default)};
    }

    .Toastify__progress-bar {
      ${PgTheme.convertToCSS(theme.components.toast.progress)};
    }

    .Toastify__close-button--light {
      ${PgTheme.convertToCSS(theme.components.toast.closeButton)};
    }
  `}
`;

export default Toast;
