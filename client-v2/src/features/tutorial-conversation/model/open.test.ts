import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/tutorial/tutorial", () => ({
  PgTutorial: { isStarted: vi.fn(), start: vi.fn(async () => {}) },
}));

import hello from "../../../tutorials/hello-anchor/tutorial.json";
import type { TutorialDefinition } from "@/entities/tutorial";
import { PgTutorial } from "../../../utils/tutorial/tutorial";
import { openOnIntro } from "./open";

const definition = hello as unknown as TutorialDefinition;

describe("features/tutorial-conversation/model/open", () => {
  beforeEach(() => {
    vi.mocked(PgTutorial.start).mockClear();
  });

  it("creates the workspace from the intro's preview on the first open", async () => {
    vi.mocked(PgTutorial.isStarted).mockReturnValue(false);

    await openOnIntro(definition);

    expect(PgTutorial.start).toHaveBeenCalledTimes(1);
    expect(PgTutorial.start).toHaveBeenCalledWith({
      files: [
        ["src/lib.rs", definition.intro.files["src/lib.rs"]],
        ["client/client.ts", definition.intro.files["client/client.ts"]],
      ],
      defaultOpenFile: "src/lib.rs",
    });
  });

  it("creates nothing when the tutorial already has its workspace", async () => {
    vi.mocked(PgTutorial.isStarted).mockReturnValue(true);

    await openOnIntro(definition);

    expect(PgTutorial.start).not.toHaveBeenCalled();
  });

  it("opens no file the preview does not hold", async () => {
    vi.mocked(PgTutorial.isStarted).mockReturnValue(false);
    const clientOnly = structuredClone(definition);
    clientOnly.intro.files = { "client/client.ts": "// the client" };

    await openOnIntro(clientOnly);

    expect(PgTutorial.start).toHaveBeenCalledWith({
      files: [["client/client.ts", "// the client"]],
      defaultOpenFile: undefined,
    });
  });
});
