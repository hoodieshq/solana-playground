import type { Disposable } from "../../utils";

/** A step of a deploy run, in the order the run takes them */
export type DeployStep = "funding" | "buffer" | "write" | "deploy";

/** Where the running deploy is; `step` is `null` while none runs */
export interface DeployRunState {
  step: DeployStep | null;
  /** How much of the program the write step has sent, 0 to 100 */
  percent: number;
  /** The run funds the wallet first, so "funding" is one of its steps */
  funds: boolean;
  /** The program exists on the cluster, so the last step upgrades it */
  upgrade: boolean;
}

/** What a finished deploy reports to whoever started it */
export interface DeployResult {
  /** The deploy or upgrade transaction; `null` when the RPC returned none */
  signature: string | null;
  /** Lamports the paying wallet spent on the run, fees included */
  cost: number;
  upgraded: boolean;
}

/**
 * Answers a caller gives the deploy in place of the terminal's questions.
 * Their presence also means the run funds the wallet without asking.
 */
export interface DeployAnswers {
  /** The last build failed: deploy the last successful build anyway? */
  confirmStaleBuild(): Promise<boolean>;
}

/** Why a run could not fund its wallet */
export type FundingFailure = "signed_out" | "no_faucet" | "airdrop_failed";

/** A run with answers stopped because the wallet holds too little SOL */
export class DeployFundingError extends Error {
  constructor(
    readonly detail: {
      reason: FundingFailure;
      /** Lamports the wallet holds */
      balance: number;
      /** Lamports the deploy needs, fees excluded */
      needed: number;
      address: string;
      /** What the airdrop said, for `airdrop_failed` */
      cause: string | null;
    }
  ) {
    super(
      detail.reason === "signed_out"
        ? "Sign in with GitHub to request devnet SOL."
        : "Not enough SOL to deploy."
    );
    this.name = "DeployFundingError";
  }
}

/** The user said no to deploying the last successful build */
export class DeployCancelledError extends Error {
  constructor() {
    super("Deployment cancelled: last build failed.");
    this.name = "DeployCancelledError";
  }
}

const IDLE: DeployRunState = {
  step: null,
  percent: 0,
  funds: false,
  upgrade: false,
};

/**
 * The running deploy's progress, read by the Deploy stage, and the answers
 * its caller gave for this one run. The terminal never sets answers, so a
 * typed `deploy` keeps asking in the terminal.
 */
export class PgDeployRun {
  static get state(): DeployRunState {
    return PgDeployRun._state;
  }

  static get answers(): DeployAnswers | null {
    return PgDeployRun._answers;
  }

  static onDidChange(cb: (state: DeployRunState) => void): Disposable {
    PgDeployRun._listeners.add(cb);
    return { dispose: () => PgDeployRun._listeners.delete(cb) };
  }

  /**
   * Run `start` with `answers` in place of the terminal's questions; they
   * apply to that run alone.
   */
  static async withAnswers<T>(
    answers: DeployAnswers,
    start: () => Promise<T>
  ): Promise<T> {
    PgDeployRun._answers = answers;
    try {
      return await start();
    } finally {
      PgDeployRun._answers = null;
    }
  }

  /** Record the run's progress; the deploy command alone calls it */
  static update(patch: Partial<DeployRunState>) {
    PgDeployRun._state = { ...PgDeployRun._state, ...patch };
    for (const cb of PgDeployRun._listeners) cb(PgDeployRun._state);
  }

  /** Back to no run; the deploy command calls it when it ends */
  static reset() {
    PgDeployRun._state = IDLE;
    for (const cb of PgDeployRun._listeners) cb(IDLE);
  }

  private static _state: DeployRunState = IDLE;
  private static _answers: DeployAnswers | null = null;
  private static readonly _listeners = new Set<
    (state: DeployRunState) => void
  >();
}
