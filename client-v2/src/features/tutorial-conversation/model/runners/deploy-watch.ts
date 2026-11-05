import type { Idl } from "@coral-xyz/anchor";

import type { Disposable } from "../../../../utils/types";

/** What the watcher reads of the deploy command and the open program */
export interface DeployWatchPort {
  /** Every run of the deploy command, from any caller, as it finishes */
  onDidFinish(cb: (result: { err?: Error }) => void): Disposable;
  /**
   * Whether the deploy has really finished. A second Deploy press while one
   * runs pauses or resumes it and finishes at once, with no deploy behind it
   */
  finished(): boolean;
  cluster(): string | null;
  /** The open program's IDL, the one the deploy just put on chain */
  idl(): Idl | null;
}

/**
 * Tell `onIdl` the IDL of every landed deploy the cards did not run: the
 * terminal's `deploy`, the explorer's menu and the assistant all go through
 * the deploy command, the cards through their own runner. Devnet only: the
 * Call panel calls the devnet program, which a deploy elsewhere left as it was.
 */
export const watchDeploys = (
  port: DeployWatchPort,
  onIdl: (idl: Idl) => void
): Disposable =>
  port.onDidFinish((result) => {
    if (result.err || !port.finished()) return;
    if (port.cluster() !== "devnet") return;
    const idl = port.idl();
    if (idl) onIdl(idl);
  });

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest;

  const IDL = { version: "0.1.0", name: "p", instructions: [] } as Idl;

  const setup = (over: Partial<Omit<DeployWatchPort, "onDidFinish">> = {}) => {
    let finish: ((r: { err?: Error }) => void) | undefined;
    const dispose = vi.fn();
    const port: DeployWatchPort = {
      onDidFinish: (cb) => {
        finish = cb;
        return { dispose };
      },
      finished: () => true,
      cluster: () => "devnet",
      idl: () => IDL,
      ...over,
    };
    const onIdl = vi.fn();
    const sub = watchDeploys(port, onIdl);
    return { finish: (r: { err?: Error }) => finish?.(r), onIdl, sub, dispose };
  };

  describe("features/tutorial-conversation/model/runners/deploy-watch", () => {
    it("passes on the IDL of a terminal deploy that landed on devnet", () => {
      const { finish, onIdl } = setup();
      finish({});
      expect(onIdl).toHaveBeenCalledWith(IDL);
    });

    it("ignores a failed deploy", () => {
      const { finish, onIdl } = setup();
      finish({ err: new Error("no funds") });
      expect(onIdl).not.toHaveBeenCalled();
    });

    it("ignores a pause or a resume, which finishes with no deploy", () => {
      const { finish, onIdl } = setup({ finished: () => false });
      finish({});
      expect(onIdl).not.toHaveBeenCalled();
    });

    it("ignores a deploy on another cluster than devnet", () => {
      const { finish, onIdl } = setup({ cluster: () => "localnet" });
      finish({});
      expect(onIdl).not.toHaveBeenCalled();
    });

    it("ignores a program with no IDL", () => {
      const { finish, onIdl } = setup({ idl: () => null });
      finish({});
      expect(onIdl).not.toHaveBeenCalled();
    });

    it("stops listening when disposed", () => {
      const { sub, dispose } = setup();
      sub.dispose();
      expect(dispose).toHaveBeenCalled();
    });
  });
}
