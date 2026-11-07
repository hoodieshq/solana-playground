import { isTerminalUnmounted, PgCommand } from "../../utils";
import { connectTo } from "./connect";

/**
 * Run `connect` from a button: in the terminal while one is mounted, so its
 * lines print there, and without one while none is, as under
 * Home, where running a command fails with `TerminalUnmounted`. Its lines are
 * dropped then; the wallet setup is a modal, which needs no terminal.
 *
 * @throws what `connect` throws, such as `SETUP_REJECTED` when the user
 * closes the setup
 */
export const connectWallet = async () => {
  try {
    await PgCommand.connect.execute();
  } catch (error) {
    if (!isTerminalUnmounted(error)) throw error;
    await connectTo(undefined);
  }
};
