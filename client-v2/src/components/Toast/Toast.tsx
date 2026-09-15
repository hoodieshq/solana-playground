import { useCallback } from "react";
import styled, { css } from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

import { PgCommon, PgTheme, PgView } from "../../utils";
import { useSetStatic } from "../../hooks";

export interface ToastChildProps {
  id: number;
}

interface ToastProps {
  /** Offset the container past the classic layout's icon rail; the flow
   * layout has no rail, so it keeps the standard edge margin */
  sidebarOffset?: boolean;
}

const Toast = ({ sidebarOffset = false }: ToastProps) => {
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
      $sidebarOffset={sidebarOffset}
    />
  );
};

const StyledContainer = styled(ToastContainer)<{ $sidebarOffset: boolean }>`
  ${({ theme, $sidebarOffset }) => css`
    &&&.Toastify__toast-container {
      left: ${$sidebarOffset ? theme.views.sidebar.left.default.width : "1rem"};
      bottom: 1rem;
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
