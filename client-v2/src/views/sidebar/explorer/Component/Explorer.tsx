import styled from "styled-components";

import Folders from "./Folders";
import NoWorkspace from "./NoWorkspace";
import Workspaces from "./Workspaces";
import { useExplorer } from "../../../../hooks";

const Explorer = () => {
  const explorer = useExplorer({ checkInitialization: true });

  if (!explorer?.isTemporary) {
    if (!explorer?.allWorkspaceNames) return null;
    if (explorer.allWorkspaceNames.length === 0) return <NoWorkspace />;
  }

  return (
    <Wrapper>
      <Workspaces />
      {/* The tree is the open project's, and there can be projects with none
          of them open (the sample projects arrive that way). Then there is no
          tree to draw, and asking for its root would throw mid-render. */}
      {(explorer?.isTemporary || explorer?.currentWorkspaceName) && <Folders />}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  user-select: none;
`;

export default Explorer;
