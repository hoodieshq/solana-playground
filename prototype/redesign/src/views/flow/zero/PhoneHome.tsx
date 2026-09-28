import type { FC, ReactNode } from "react";
import styled, { css } from "styled-components";

import BrandIcon from "../../../components/BrandIcon";
import PlayRing from "../../../components/PlayRing";
import { useRenderOnChange } from "../../../hooks";
import { PgExplorer, PgFramework, PgTutorial, PgView } from "../../../utils";
import NewWorkspaceModal from "../gallery/NewWorkspaceModal";
import { ICONS } from "../nav/icons";
import { PHONE_SIZE, PHONE_TYPE } from "../phone";
import { BRAND } from "../tokens";

/**
 * The start screen on a phone, after Claude's: the question in the middle of
 * the screen, and the composer at its foot with a few ways straight in just
 * above it. Each quickstart does its thing in one press — picks up the last
 * project, makes a new Anchor project, opens the first tutorial — and the
 * composer's own top row goes to the whole gallery for everything else.
 */

interface PhoneHomeProps {
  /** Opens a project that is not a tutorial's */
  onOpenProject: (name: string) => void;
}

const PhoneHome: FC<PhoneHomeProps> = ({ onOpenProject }) => {
  // The last project is whichever is current; it changes under the screen
  useRenderOnChange(PgExplorer.onDidSwitchWorkspace);
  useRenderOnChange(PgExplorer.onDidInit);

  const last = PgExplorer.currentWorkspaceName;
  const lastIsLesson = !!last && PgTutorial.isWorkspaceTutorial(last);
  // The first beginner tutorial, or the next when that is the one to continue
  const lesson =
    PgTutorial.all.find((t) => t.level === "Beginner" && t.name !== last) ??
    PgTutorial.all.find((t) => t.name !== last);
  const framework = PgFramework.all[0];

  const quickstarts: Quickstart[] = [];
  if (last) {
    quickstarts.push({
      id: "continue",
      icon: ICONS.folder,
      tint: BRAND.purple,
      title: `Continue ${last}`,
      sub: lastIsLesson ? "The tutorial you were in" : "Your last project",
      onPress: () =>
        lastIsLesson
          ? PgTutorial.open(last).catch(() => onOpenProject(last))
          : onOpenProject(last),
    });
  }
  if (framework) {
    quickstarts.push({
      id: "new",
      icon: <BrandIcon name="new" />,
      tint: BRAND.green,
      title: `New ${framework.name} project`,
      sub: "A working starter you shape with the assistant",
      onPress: () => createProject(framework.name),
    });
  }
  if (lesson) {
    quickstarts.push({
      id: "lesson",
      icon: <BrandIcon name="tutorial" />,
      tint: BRAND.periwinkle,
      title: lesson.name,
      sub: `${lesson.level} tutorial`,
      onPress: () => PgTutorial.open(lesson.name).catch(fail),
    });
  }

  return (
    <>
      <Hero>
        <Mark aria-hidden="true" />
        <Title>Where should we begin?</Title>
      </Hero>

      <Quickstarts aria-label="Quick start">
        {quickstarts.slice(0, 3).map((q) => (
          <Card key={q.id} type="button" onClick={q.onPress}>
            <Tile $tint={q.tint} aria-hidden="true">
              {q.icon}
            </Tile>
            <Text>
              <CardTitle>{q.title}</CardTitle>
              <CardSub>{q.sub}</CardSub>
            </Text>
            <Chevron aria-hidden="true">{ICONS.forward}</Chevron>
          </Card>
        ))}
      </Quickstarts>
    </>
  );
};

export default PhoneHome;

/**
 * The composer's top row on the phone's start screen: everything the
 * quickstarts leave out, a press away in the gallery.
 */
export const GalleryRow: FC<{ programs: number | null }> = ({ programs }) => (
  <>
    <RowText>
      {PgTutorial.all.length} tutorials, {programs === null ? "real" : programs}{" "}
      programs
    </RowText>
    <Browse type="button" onClick={() => PgView.setModal(NewWorkspaceModal)}>
      <span>Browse</span>
    </Browse>
  </>
);

interface Quickstart {
  id: string;
  icon: ReactNode;
  tint: string;
  title: string;
  sub: string;
  onPress: () => unknown;
}

/** A new project from the framework's own starter, under a free name */
const createProject = async (framework: FrameworkName) => {
  try {
    const base = `${framework.toLowerCase()}-project`;
    const taken = PgExplorer.allWorkspaceNames ?? [];
    let name = base;
    for (let i = 2; taken.includes(name); i++) name = `${base}-${i}`;

    const { getDefaultFiles, defaultOpenFile } = PgFramework.get(framework);
    const { files } = await getDefaultFiles();
    await PgExplorer.createWorkspace(name, { files, defaultOpenFile });
  } catch (e) {
    fail(e);
  }
};

const fail = (e: unknown) =>
  PgView.setToast(
    <span>
      {e instanceof Error && e.message ? e.message : "That did not work"}
    </span>
  );

/* In the middle of what the quickstarts leave: the mark, and the question */
const Hero = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 9rem;
  padding: 1.5rem 0;
  text-align: center;
`;

const Mark = styled(PlayRing)`
  ${({ theme }) => css`
    width: 2.5rem;
    height: 2.5rem;
    color: ${theme.colors.default.primary};
    filter: drop-shadow(0 0 18px ${theme.colors.default.primary}66);
  `}
`;

const Title = styled.h1`
  ${({ theme }) => css`
    margin: 0;
    ${PHONE_TYPE.display}
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Quickstarts = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  padding-bottom: 0.75rem;
`;

/* A card per quickstart: a tinted tile for what it is, its name, one line */
const Card = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.875rem;
    width: 100%;
    min-height: 64px;
    padding: 0.625rem 0.75rem 0.625rem 0.625rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const Tile = styled.span<{ $tint: string }>`
  ${({ $tint }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 12px;
    background: ${$tint}1f;
    color: ${$tint};

    & > svg {
      width: 20px;
      height: 20px;
    }
  `}
`;

const Text = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const CardTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  ${PHONE_TYPE.body}
  font-weight: 440;
  line-height: 1.3;
`;

const CardSub = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    ${PHONE_TYPE.label}
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Chevron = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    width: 18px;
    height: 18px;
    color: ${theme.colors.state.disabled.color};

    & > svg {
      width: 100%;
      height: 100%;
    }
  `}
`;

const RowText = styled.span`
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    ${PHONE_TYPE.secondary}
    color: ${theme.colors.default.textSecondary};
  `}
`;

/* A fingertip to press, drawn as the smaller pill Claude's row carries */
const Browse = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: ${PHONE_SIZE.target};
    height: ${PHONE_SIZE.target};
    padding: 0;
    border: none;
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    & > span {
      display: flex;
      align-items: center;
      height: 2.25rem;
      padding: 0 1rem;
      border: 1px solid ${theme.colors.default.border};
      border-radius: 999px;
      background: ${theme.colors.default.bgPrimary};
      color: ${theme.colors.default.textPrimary};
      ${PHONE_TYPE.control}
    }

    &:active > span {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: none;

      & > span {
        outline: 2px solid ${theme.colors.default.primary};
        outline-offset: 2px;
      }
    }
  `}
`;
