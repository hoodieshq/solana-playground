import { next } from "@vercel/functions"

// The prototype is a non production stand: every path, assets and 404s included, sits behind
// basic auth. Login, password and the robots header all come from the project's env, so nothing
// here can leak into a real site. With the login or password unset the stand stays shut
export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER
  const password = process.env.BASIC_AUTH_PASSWORD
  const robots = process.env.ROBOTS_TAG ? { "X-Robots-Tag": process.env.ROBOTS_TAG } : {}

  const header = request.headers.get("authorization") ?? ""
  const [scheme, encoded] = header.split(" ")
  if (user && password && scheme === "Basic" && encoded) {
    const decoded = atob(encoded)
    const at = decoded.indexOf(":")
    if (decoded.slice(0, at) === user && decoded.slice(at + 1) === password) {
      // The root opens the prototype. It's here, not in vercel.json, since those redirects run
      // before the middleware and would answer a stranger without the password
      if (new URL(request.url).pathname === "/") return new Response(null, { status: 307, headers: { Location: "/prototype/tutorial/", ...robots } })
      return next({ headers: robots })
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Playground prototype", charset="UTF-8"', "Cache-Control": "no-store", ...robots },
  })
}

export const config = { matcher: "/:path*" }
