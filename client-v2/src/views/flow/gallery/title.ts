/**
 * A tutorial's name as people read it. The names come from upstream's
 * tutorial data, where the name is also the key a tutorial is opened and
 * its workspace stored by, so a name is never changed there: only shown
 * differently here.
 */
const SHOWN: Record<string, string> = {
  "Tictactoe Seahorse": "Tic-tac-toe Seahorse",
};

export const tutorialTitle = (name: string) => SHOWN[name] ?? name;
