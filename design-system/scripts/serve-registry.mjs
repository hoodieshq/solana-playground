/* Serve the built registry to `shadcn add`, from the repo.
 *
 * registry.json names its dependencies @playground/<name>, and a consumer's
 * components.json maps @playground to this server, so an install never
 * reaches the public host. A missing item answers 404 JSON, not a page, so
 * shadcn reports it as not found.
 *
 *   npm run build:registry && npm run registry:serve     PORT=3010 by default
 */
import http from "node:http"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, "../registry-dist/r")
const PORT = Number(process.env.PORT || 3010)

http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost")
    const item = pathname.match(/^\/r\/([a-z0-9-]+)\.json$/)?.[1]
    try {
      if (!item) throw new Error("not a registry item")
      const body = await readFile(path.join(ROOT, `${item}.json`))
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(body)
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Not Found", message: pathname }))
    }
    console.log(res.statusCode, pathname)
  })
  .on("error", (err) => {
    console.error(err.message)
    process.exit(1)
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`registry on http://localhost:${PORT}/r`)
  })
