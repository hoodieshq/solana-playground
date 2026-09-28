import { FC, useRef, useState } from "react";
import styled, { css } from "styled-components";

import Button, { ButtonProps } from "../Button";
import FadeIn from "../FadeIn";
import Text from "../Text";
import { Close, Sad } from "../Icons";
import { PROJECT_NAME } from "../../constants";
import { OrString, PgTheme, PgView, SyncOrAsync } from "../../utils";
import { useKeybind, useOnClickOutside } from "../../hooks";
import { PHONE, PHONE_SIZE, PHONE_TYPE } from "../../views/flow/phone";

export interface SingleModalProps {
  /** Modal title to show. If `true`, defaults to {@link PROJECT_NAME}. */
  title?: boolean | string;
  /** Modal's submit button props */
  buttonProps?: ButtonProps & {
    /** Button text to show */
    text: OrString<"Continue">;
    /** Callback function to run on submit */
    onSubmit?: () => SyncOrAsync;
    /** Whether to skip closing the modal when user submits */
    noCloseOnSubmit?: boolean;
  };
  /**
   * Whether to show a close button on top-right.
   *
   * Defaults to `!buttonProps?.onSubmit`.
   */
  closeButton?: boolean;
}

const SingleModal: FC<SingleModalProps> = ({
  title,
  buttonProps,
  closeButton = !buttonProps?.onSubmit,
  children,
}) => {
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!buttonProps || buttonProps.disabled) return;

    try {
      const data = await buttonProps.onSubmit?.();

      // Close unless explicitly forbidden
      if (!buttonProps.noCloseOnSubmit) PgView.closeModal(data);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  };

  // Submit on Enter
  // Intentionally clicking the button in order to trigger the button's loading
  // state on Enter as opposed to using `handleSubmit` which wouldn't change
  // submit button's state.
  const buttonRef = useRef<HTMLButtonElement>(null);
  useKeybind("Enter", () => buttonRef.current?.click());

  const wrapperRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(wrapperRef, PgView.closeModal);

  return (
    <Wrapper ref={wrapperRef}>
      {/* Take away the focus of other buttons when the modal is mounted */}
      <FocusButton autoFocus />

      <TopWrapper>
        {title && <Title>{title === true ? PROJECT_NAME : title}</Title>}
        {closeButton && (
          <CloseButtonWrapper hasTitle={!!title}>
            <Button kind="icon" onClick={PgView.closeModal}>
              <Close />
            </Button>
          </CloseButtonWrapper>
        )}
      </TopWrapper>

      <ScrollableWrapper>
        <ContentWrapper>
          {error && (
            <ErrorText kind="error" icon={<Sad />}>
              {error}
            </ErrorText>
          )}

          {children}
        </ContentWrapper>

        {buttonProps && (
          <ButtonsWrapper>
            {!closeButton && buttonProps.onSubmit && (
              <Button onClick={PgView.closeModal} kind="transparent">
                Cancel
              </Button>
            )}

            <Button
              {...buttonProps}
              ref={buttonRef}
              onClick={handleSubmit}
              kind={
                buttonProps.onSubmit
                  ? buttonProps.kind ?? "primary-transparent"
                  : "outline"
              }
            >
              {buttonProps.text}
            </Button>
          </ButtonsWrapper>
        )}
      </ScrollableWrapper>
    </Wrapper>
  );
};

/* On a phone a dialog is a page: the whole screen, the bar every page has
   across its top, and its actions at the foot, under the thumb */
const Wrapper = styled(FadeIn)`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.components.modal.default)};

    ${PHONE} {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
      background: ${theme.colors.default.bgPrimary};
    }
  `}
`;

const TopWrapper = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.components.modal.top)};

    ${PHONE} {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      min-height: calc(${PHONE_SIZE.bar} + env(safe-area-inset-top, 0px));
      padding: env(safe-area-inset-top, 0px) 0.5rem 0 1.25rem;
      border-bottom: 1px solid ${theme.colors.default.border};
    }
  `}
`;

/* A theme's own title styles, or the centred-over-a-rule title every theme
   drew before the title was a part of its own */
const Title = styled.div`
  ${({ theme }) => css`
    ${theme.components.modal.title
      ? css`
          ${PgTheme.convertToCSS(theme.components.modal.title)};
        `
      : css`
          width: 100%;
          text-align: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid ${theme.colors.default.border};
        `}

    /* A page's title, in the bar */
    ${PHONE} {
      flex: 1;
      min-width: 0;
      padding: 0 3.5rem 0 0;
      border: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: left;
      font-family: ${theme.font.other.family};
      ${PHONE_TYPE.title}
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const CloseButtonWrapper = styled.div<{ hasTitle: boolean }>`
  ${({ hasTitle }) =>
    hasTitle
      ? css`
          position: absolute;
          top: 0;
          right: 1.5rem;
          bottom: 0;
          margin: auto;
          display: flex;
          align-items: center;
        `
      : css`
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
        `}

  /* The bar's way back, where every page keeps it */
  ${PHONE} {
    right: 0.5rem;
    margin-top: 0;

    && button {
      width: ${PHONE_SIZE.target};
      height: ${PHONE_SIZE.target};
      border-radius: 12px;
    }

    && svg {
      width: 22px;
      height: 22px;
    }
  }
`;

const ScrollableWrapper = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  ${PgTheme.getScrollbarCSS()};

  ${PHONE} {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overscroll-behavior: contain;
  }
`;

const ContentWrapper = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.components.modal.content)};

    ${PHONE} {
      flex: 1 0 auto;
      padding: 1.25rem 1.25rem 1.5rem;
      ${PHONE_TYPE.body}
    }
  `}
`;

const ErrorText = styled(Text)`
  margin-bottom: 1rem;
`;

const ButtonsWrapper = styled.div`
  ${({ theme }) => css`
    & button:nth-child(2) {
      margin-left: 1rem;
    }

    ${PgTheme.convertToCSS(theme.components.modal.bottom)};

    /* Pinned to the foot of the page, the choice under the thumb */
    ${PHONE} {
      position: sticky;
      bottom: 0;
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid ${theme.colors.default.border};
      background: ${theme.colors.default.bgPrimary};

      & > button {
        flex: 1;
        height: ${PHONE_SIZE.target};
      }

      & button:nth-child(2) {
        margin-left: 0;
      }
    }
  `}
`;

const FocusButton = styled.button`
  opacity: 0;
  position: absolute;
`;

export default SingleModal;
