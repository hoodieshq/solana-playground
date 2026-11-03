import {
  BaseBrokenLink,
  backToDocsHref,
  decodeDocsLink,
  docsLinkTelemetry,
  PgDocsLink,
} from "@/features/docs-link";
import { PgExplorer, PgRouter } from "../../utils";
import { handleRoute } from "../common";

/**
 * `/open#v=1&name=…&code=…`: the docs' "Open in Playground". The file opens
 * as an unsaved client project, as a gist link does; a fragment that does
 * not decode shows "This link is broken" instead.
 */
export const open = PgRouter.create({
  path: "/open",
  handle: () => {
    const decoded = decodeDocsLink(window.location.hash);

    if (!decoded.ok) {
      docsLinkTelemetry.track("docs_link_failed", { reason: decoded.reason });
      PgDocsLink.set(null);
      const backHref = backToDocsHref(decoded.from, document.referrer);
      return handleRoute({
        main: async () => (
          <BaseBrokenLink
            backHref={backHref}
            onHome={() => PgRouter.navigate("/")}
          />
        ),
      });
    }

    const { link } = decoded;
    const route = handleRoute({
      getExplorerInitArg: () => {
        PgDocsLink.set(link);
        docsLinkTelemetry.track("docs_link_opened", {
          host: link.from ? new URL(link.from).hostname : "none",
          bytes: new TextEncoder().encode(link.code).length,
        });
        return {
          files: [
            [`${PgExplorer.PATHS.CLIENT_DIRNAME}/${link.name}`, link.code],
          ],
        };
      },
    });

    return {
      dispose: () => {
        route.dispose();
        // Another route took over: its project did not come from this link
        PgDocsLink.set(null);
      },
    };
  },
});
