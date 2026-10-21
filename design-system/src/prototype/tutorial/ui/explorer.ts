import { toast } from "sonner"

/** Explorer, where a real deploy would send you (explorer.solana.com/address/<id> or /tx/<signature>,
 * ?cluster=devnet). Nothing in this prototype is on devnet, so a real link would open a page that
 * finds nothing and reads as a failed deploy; it says so instead, as the prototype's other stubs do */
export const openExplorer = () => toast("Nothing is really on devnet in this prototype, so Explorer has nothing to show yet")
