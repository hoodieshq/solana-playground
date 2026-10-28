// "Download .so", connected: what it saves, what a lost build says, and the
// events each outcome sends.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { PgServerError } from "@/utils/server-error";

const mocks = vi.hoisted(() => ({
  idl: null as unknown,
  uuid: "build-uuid" as string | null,
  deploy: vi.fn(),
  error: vi.fn(),
  setToast: vi.fn(),
}));

vi.mock("@/utils", () => ({
  PgExplorer: { currentWorkspaceName: "My Counter" },
  PgProgramInfo: {
    onDidChangeIdl: "idl",
    get uuid() {
      return mocks.uuid;
    },
  },
  PgServer: { deploy: mocks.deploy },
}));
vi.mock("@/hooks", () => ({ useRenderOnChange: () => mocks.idl }));
vi.mock("@/shared/lib/logger", () => ({
  createLogger: () => ({
    error: mocks.error,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import DownloadProgram from "./DownloadProgram";

let sent: ReturnType<typeof memoryProvider>;
let saved: { download: string; href: string }[];
beforeEach(() => {
  mocks.idl = { metadata: { name: "hello_anchor" }, instructions: [] };
  mocks.uuid = "build-uuid";
  mocks.deploy.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]));
  saved = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    saved.push({ download: this.download, href: this.href });
  });
  URL.createObjectURL = vi.fn(() => "blob:binary");
  URL.revokeObjectURL = vi.fn();
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  resetTelemetry();
  vi.restoreAllMocks();
});

const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Download .so" }));
  });
};

describe("features/cli-deploy/ui/DownloadProgram", () => {
  it("saves the last build's binary under the program's name", async () => {
    render(<DownloadProgram from="build-stage" />);
    await press();

    expect(mocks.deploy).toHaveBeenCalledWith("build-uuid");
    expect(saved).toEqual([
      { download: "hello_anchor.so", href: "blob:binary" },
    ]);
    expect(sent.events).toEqual([
      expect.objectContaining({
        name: "cli_binary_downloaded",
        params: { from: "build-stage" },
      }),
    ]);
  });

  it("names the binary after the workspace without an IDL", async () => {
    mocks.idl = null;
    render(<DownloadProgram from="guide" />);
    await press();

    expect(saved[0].download).toBe("my_counter.so");
  });

  it("asks for a rebuild when the server lost the build", async () => {
    mocks.deploy.mockRejectedValue(
      new PgServerError("http://s/deploy/u", 500, "Program is not built")
    );
    render(<DownloadProgram from="guide" />);
    await press();

    expect(saved).toEqual([]);
    expect(screen.getByRole("status").textContent).toBe(
      "Build again to download the binary."
    );
    expect(sent.events).toEqual([
      expect.objectContaining({
        name: "cli_binary_download_failed",
        params: { from: "guide", reason: "not-built" },
      }),
    ]);
  });

  it("reports any other failure and asks for no rebuild", async () => {
    mocks.deploy.mockRejectedValue(
      new PgServerError("http://s/deploy/u", 502, "Bad gateway")
    );
    render(<DownloadProgram from="build-stage" />);
    await press();

    expect(screen.queryByRole("status")).toBeNull();
    expect(sent.events).toEqual([
      expect.objectContaining({
        name: "cli_binary_download_failed",
        params: { from: "build-stage", reason: "server" },
      }),
    ]);
  });
});
