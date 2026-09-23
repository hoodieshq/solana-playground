import { FC, useState } from "react";
import styled, { css } from "styled-components";

import Img from "../../../components/Img";
import Input from "../../../components/Input";
import GradientButton from "../../sidebar/assistant/Component/GradientButton";
import { PgExplorer, PgFramework, PgView } from "../../../utils";

/**
 * The gallery's one decisive action: pick a framework, name the project,
 * go. Mirrors the existing "Create workspace" modal's mechanism exactly
 * (`views/sidebar/explorer/Component/Modals/CreateWorkspace.tsx`) --
 * `PgFramework.get(name).getDefaultFiles()` then `PgExplorer.createWorkspace`
 * -- just laid out as a single row instead of a full-page form.
 */
const StartFromScratch: FC = () => {
  const [framework, setFramework] = useState<FrameworkName | undefined>(
    PgFramework.all[0]?.name
  );
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const create = async () => {
    if (!framework) return;

    const projectName = name.trim() || defaultName(framework);
    if (!PgExplorer.isWorkspaceNameValid(projectName)) {
      setError("Invalid project name");
      return;
    }

    try {
      const { getDefaultFiles, defaultOpenFile } = PgFramework.get(framework);
      const { files } = await getDefaultFiles();
      await PgExplorer.createWorkspace(projectName, {
        files,
        defaultOpenFile,
      });
      PgView.setModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
    }
  };

  return (
    <Row>
      <Plus aria-hidden="true">+</Plus>

      <Text>
        <Eyebrow>Blank canvas</Eyebrow>
        <Title>Start from scratch</Title>
        <Sub>A working starter you shape with the assistant.</Sub>
      </Text>

      <Frameworks role="radiogroup" aria-label="Framework">
        {PgFramework.all.map((f) => (
          <FrameworkOption
            key={f.name}
            type="button"
            role="radio"
            aria-checked={framework === f.name}
            $active={framework === f.name}
            onClick={() => setFramework(f.name)}
          >
            <FrameworkIcon src={f.icon} $circle={f.circleImage} />
            {f.name}
          </FrameworkOption>
        ))}
      </Frameworks>

      <Controls>
        {/* `Input` renders `error` as a message above itself, so a creation
            failure (e.g. a duplicate name) surfaces right at the field. */}
        <NameInput
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          error={error}
          setError={setError}
          placeholder={framework ? defaultName(framework) : "project name"}
          aria-label="Project name"
        />
        <GradientButton
          kind="primary"
          disabled={!!error || !framework}
          onClick={create}
        >
          Start &rarr;
        </GradientButton>
      </Controls>
    </Row>
  );
};

export default StartFromScratch;

const defaultName = (framework: FrameworkName) =>
  `${framework.toLowerCase()}-project`;

const Row = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.125rem;
    /* Same hairline and surface as every other card on the page. The accent
       border it had made one option shout over the rest of the list. */
    border: 1px solid ${theme.colors.default.border};
    border-radius: 14px;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const Plus = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textPrimary};
    font-size: 1.25rem;
    line-height: 1;
  `}
`;

const Text = styled.div`
  flex: 1 1 12rem;
  min-width: 0;
`;

/* Sentence case, quiet, the same voice as the section headings around it */
const Eyebrow = styled.div`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.state.disabled.color};
  `}
`;

const Title = styled.div`
  ${({ theme }) => css`
    margin-top: 0.125rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Sub = styled.div`
  ${({ theme }) => css`
    margin-top: 0.125rem;
    color: ${theme.colors.default.textSecondary};
    font-size: 0.8125rem;
  `}
`;

const Frameworks = styled.div`
  display: flex;
  gap: 0.375rem;
`;

const FrameworkOption = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.625rem;
    border: 1px solid transparent;
    border-radius: 8px;
    /* The chosen one is a filled pill, the rest are plain — the same mark the
       top bar uses for its current switch, so the page has one way of saying
       "this one". */
    background: ${$active ? theme.colors.state.hover.bg : "transparent"};
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    font-weight: ${$active ? 600 : 500};
    white-space: nowrap;
    cursor: pointer;
    transition: border-color ${theme.default.transition.duration.short}
      ${theme.default.transition.type};

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const FrameworkIcon = styled(Img)<{ $circle?: boolean }>`
  width: 1.125rem;
  height: 1.125rem;
  border-radius: ${({ $circle }) => ($circle ? "50%" : "0.25rem")};
`;

const Controls = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`;

const NameInput = styled(Input)`
  ${({ theme }) => css`
    width: 12rem;
    height: 2rem;
    padding: 0 0.75rem;
    border-radius: 8px;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;
