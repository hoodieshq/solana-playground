import { FC, Fragment } from "react";
import styled, { css } from "styled-components";

import Button from "../../Button";
import Link from "../../Link";
import Markdown from "../../Markdown";
import PlayRing from "../../PlayRing";
import TutorialDetails from "../TutorialDetails";
import { PointedArrow } from "../../Icons";
import { Emoji } from "../../../constants";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PgTheme, PgTutorial } from "../../../utils";
import { BRAND } from "../../../views/flow/tokens";
import type { TutorialAboutComponentProps } from "../types";

export const About: FC<TutorialAboutComponentProps> = ({
  about,
  isStarted,
  start,
}) => {
  const tutorial = PgTutorial.current!;
  const isFinished = PgTutorial.completed;

  return (
    <Wrapper>
      <GoBackButtonWrapper>
        <Link href="/tutorials">
          <Button kind="no-border" leftIcon={<PointedArrow rotate="180deg" />}>
            Go back to tutorials
          </Button>
        </Link>
      </GoBackButtonWrapper>

      <TutorialAboutPage>
        <GeneratedWrapper>
          <GeneratedTopWrapper>
            <GeneratedTopLeftWrapper>
              <TutorialName>{tutorial.name}</TutorialName>
              <TutorialAuthorsWrapper>
                <TutorialAuthorsByText>by </TutorialAuthorsByText>
                {tutorial.authors.length !== 0 &&
                  tutorial.authors.map((author, i) => (
                    <Fragment key={i}>
                      {i !== 0 && (
                        <TutorialAuthorSeperator>, </TutorialAuthorSeperator>
                      )}
                      {author.link ? (
                        <TutorialAuthorLink href={author.link}>
                          {author.name}
                        </TutorialAuthorLink>
                      ) : (
                        <TutorialAuthorWithoutLink>
                          {author.name}
                        </TutorialAuthorWithoutLink>
                      )}
                    </Fragment>
                  ))}
              </TutorialAuthorsWrapper>
            </GeneratedTopLeftWrapper>

            <GeneratedTopRightWrapper>
              {isFinished ? (
                <Button
                  onClick={start}
                  kind="no-border"
                  color="success"
                  fontWeight="bold"
                  leftIcon={<span>{Emoji.CHECKMARK}</span>}
                >
                  Completed
                </Button>
              ) : (
                <StartButton
                  onClick={start}
                  kind="primary"
                  rightIcon={<PlayIcon />}
                >
                  {isStarted ? "Continue" : "Start"}
                </StartButton>
              )}
            </GeneratedTopRightWrapper>
          </GeneratedTopWrapper>

          <GeneratedBottomWrapper>
            <TutorialDescription>{tutorial.description}</TutorialDescription>

            <TutorialDetails
              details={[
                { kind: "level", data: tutorial.level },
                { kind: "framework", data: tutorial.framework },
                { kind: "languages", data: tutorial.languages },
                // TODO: Enable once there are more tutorials with various categories
                // { kind: "categories", data: tutorial.categories },
              ]}
            />
          </GeneratedBottomWrapper>
        </GeneratedWrapper>

        <CustomWrapper>
          {typeof about === "string" ? (
            <Markdown linkable>{about}</Markdown>
          ) : (
            about
          )}
        </CustomWrapper>
      </TutorialAboutPage>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  height: 100%;
  width: 100%;
  overflow: auto;
`;

const GoBackButtonWrapper = styled.div`
  display: flex;
  align-items: center;
  height: ${({ theme }) => theme.components.tabs.tab.default.height};
  padding-left: 1rem;

  & svg {
    width: 1.25rem;
    height: 1.25rem;
  }
`;

const TutorialAboutPage = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.components.tutorial.aboutPage)};
  `}
`;

const GeneratedWrapper = styled.div`
  padding: 1.5rem 0;
`;

const GeneratedTopWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const GeneratedTopLeftWrapper = styled.div``;

const TutorialName = styled.h1``;

const TutorialAuthorsWrapper = styled.div`
  ${({ theme }) => css`
    margin-top: 0.5rem;
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const TutorialAuthorsByText = styled.span``;

const TutorialAuthorSeperator = styled.span``;

const TutorialAuthorLink = styled(Link)``;

const TutorialAuthorWithoutLink = styled.span``;

const GeneratedTopRightWrapper = styled.div``;

/* The brand slides' "Start Tutorial", at the page's size: Solana's green into
   its purple, a white label in the headline face and the play ring after it.
   The fill holds through the base button's hover and disabled repaints (it
   disables itself while `start` resolves). */
const StartButton = styled(Button)`
  ${({ theme }) => css`
    &&,
    &&:hover,
    &&:disabled,
    &&:disabled:hover {
      background: ${BRAND.fill};
      color: #ffffff;
    }

    && {
      height: 2.5rem;
      padding: 0 1rem 0 1.25rem;
      border: none;
      border-radius: 999px;
      font-family: ${HEADLINE_FONT};
      font-size: 0.9375rem;
      font-weight: 500;
      letter-spacing: -0.005em;
      white-space: nowrap;
      transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
        filter 200ms ease;
    }

    && > span.right-icon > * {
      margin-left: 0.5rem;
    }

    &&:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.05);
    }

    &&:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      && {
        transition: none;
      }
      &&:hover:not(:disabled) {
        transform: none;
      }
    }
  `}
`;

/* Our play icon, sized to the label beside it */
const PlayIcon = styled(PlayRing)`
  flex-shrink: 0;
  width: 1.15em;
  height: 1.15em;
`;

const GeneratedBottomWrapper = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TutorialDescription = styled.p`
  color: ${({ theme }) => theme.colors.default.textSecondary};
  line-height: 1.5;
`;

const CustomWrapper = styled.div``;
