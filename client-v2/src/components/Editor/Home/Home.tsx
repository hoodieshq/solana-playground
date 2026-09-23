import { FC, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../Button";
import Card from "../../Card";
import Img from "../../Img";
import Link from "../../Link";
import { ResourceProps, RESOURCES } from "./resources";
import { TutorialProps, TUTORIALS } from "./tutorials";
import { External, ShortArrow } from "../../Icons";
import { PROJECT_NAME } from "../../../constants";
import { PgFramework, PgTheme, PgView } from "../../../utils";

const Home = () => {
  // This prevents unnecessarily fetching the home content for a frame when the
  // app is first mounted
  const [resources, setResources] = useState<ResourceProps[]>();
  useEffect(() => {
    setResources(
      PgFramework.all
        .filter((f) => f.docs)
        .map((f) => ({ ...f, ...f.docs } as ResourceProps))
        .concat(RESOURCES)
    );
  }, []);

  if (!resources) return null;

  return (
    <Wrapper id={PgView.ids.HOME}>
      <ProjectTitle>{PROJECT_NAME}</ProjectTitle>

      <ContentWrapper>
        <ResourcesWrapper>
          <ResourcesTitle>Resources</ResourcesTitle>
          <ResourceCardsWrapper>
            {resources.map((r, i) => (
              <Resource key={i} {...r} />
            ))}
          </ResourceCardsWrapper>
        </ResourcesWrapper>

        <TutorialsWrapper>
          <TutorialsTitle>Tutorials</TutorialsTitle>
          <TutorialCardsWrapper>
            {TUTORIALS.map((t, i) => (
              <Tutorial key={i} {...t} />
            ))}
          </TutorialCardsWrapper>

          <Link href="/tutorials">
            <PlaygroundTutorialsButton kind="icon">
              Playground tutorials
              <ShortArrow />
            </PlaygroundTutorialsButton>
          </Link>
        </TutorialsWrapper>
      </ContentWrapper>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.default)};
  `}
`;

const ProjectTitle = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.title)};
  `}
`;

// Stacked, not side by side. The two sections used to share a row, which left
// the bento about a third of the panel — too narrow ever to be more than one
// column, which is the whole point of a bento.
const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  width: 100%;
`;

const ResourcesWrapper = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.resources.default)};
    /* Overrides the theme's fixed width: the grid decides its own columns. */
    width: 100%;
    max-width: none;
  `}
`;

const ResourcesTitle = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.resources.title)};
  `}
`;

// A bento: even columns, tiles that take one or two of them. The columns are
// sized by the grid rather than the tiles, so nothing has to be measured by
// hand and the arrangement reflows without leaving holes.
const ResourceCardsWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.75rem;
  align-items: stretch;
`;

/**
 * One tile in the bento.
 *
 * The whole tile is the link, so there is no "Learn more" button repeated
 * eight times down the page — a widget you tap is a widget, a widget with a
 * button inside it is a form. `$wide` tiles take two columns; the first two
 * resources get it, which is what gives the grid its rhythm instead of the
 * eight identical boxes this used to be.
 */
const Resource: FC<ResourceProps & { $wide?: boolean }> = ({
  name,
  description,
  url,
  icon,
  circleImage,
  $wide,
}) => (
  <ResourceCard href={url} $wide={$wide}>
    <ResourceTitle>
      <ResourceImg src={icon} $circleImage={circleImage} />
      {name}
    </ResourceTitle>
    <ResourceDescription>{description}</ResourceDescription>
    <ResourceGo aria-hidden="true">
      <External />
    </ResourceGo>
  </ResourceCard>
);

const ResourceCard = styled.a<{ $wide?: boolean }>`
  ${({ theme, $wide }) => css`
    ${PgTheme.convertToCSS(
      theme.views.main.primary.home.resources.card.default
    )};

    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    /* The theme pins these to a 15rem square, which is why they would not fill
       a grid column or honour a span. The grid sizes them now. */
    width: auto;
    height: auto;
    min-height: 9.5rem;
    padding: 1.125rem;
    text-decoration: none;
    overflow: hidden;
    transition: background 0.12s ease, border-color 0.12s ease;
    ${$wide && "grid-column: span 2;"}

    /* Wide tiles give their description room; narrow ones stay terse. */
    @media (max-width: 40rem) {
      grid-column: span 1;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      border-color: ${theme.colors.default.border};
    }

    &:hover > span:last-child {
      opacity: 1;
      transform: translate(0, 0);
    }
  `}
`;

/* The arrow is the only thing that moves: it appears on hover in the corner,
   which is how a widget says it is a link without carrying a button. */
const ResourceGo = styled.span`
  ${({ theme }) => css`
    position: absolute;
    top: 1.125rem;
    right: 1.125rem;
    display: flex;
    color: ${theme.colors.default.textSecondary};
    opacity: 0;
    transform: translate(-2px, 2px);
    transition: opacity 0.12s ease, transform 0.12s ease;

    & svg {
      width: 0.875rem;
      height: 0.875rem;
    }
  `}
`;

const ResourceTitle = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.resources.card.title)};
  `}
`;

const ResourceImg = styled(Img)<{ $circleImage?: boolean }>`
  ${({ theme, $circleImage }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.resources.card.image)};

    ${$circleImage && "border-radius: 50%"};
  `};
`;

const ResourceDescription = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(
      theme.views.main.primary.home.resources.card.description
    )};
  `}
`;

const TutorialsWrapper = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.tutorials.default)};
    width: 100%;
    max-width: none;
  `}
`;

const TutorialsTitle = styled.div`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.tutorials.title)};
  `}
`;

const TutorialCardsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Tutorial: FC<TutorialProps> = ({ title, url }) => {
  const src = getSrc(url);

  return (
    <Link href={url}>
      <TutorialCard>
        {src && <TutorialIcon src={src} />}
        <TutorialTitle>{title}</TutorialTitle>
      </TutorialCard>
    </Link>
  );
};

const getSrc = (url: string) => {
  let src = "";

  if (url.includes("youtube.com")) src = "youtube.png";
  else if (url.includes("dev.to")) src = "devto.png";

  if (src) return "/icons/platforms/" + src;
};

const TutorialCard = styled(Card)`
  ${({ theme }) => css`
    ${PgTheme.convertToCSS(theme.views.main.primary.home.tutorials.card)};
  `}
`;

const TutorialIcon = styled(Img)`
  height: 1rem;
  margin-right: 0.75rem;
`;

const TutorialTitle = styled.span``;

const PlaygroundTutorialsButton = styled(Button)`
  ${({ theme }) => css`
    margin-top: 1rem;

    color: ${theme.colors.default.primary};
    padding: 0.25rem 0.5rem;

    svg {
      margin-left: 0.25rem;
    }

    &::hover {
      text-decoration: underline;
    }
  `}
`;

export default Home;
