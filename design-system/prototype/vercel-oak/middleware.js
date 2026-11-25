import { next } from "@vercel/functions"

// The prototype is a non production stand: every path, assets and 404s included, sits behind
// basic auth. Login, password and the robots header all come from the project's env, so nothing
// here can leak into a real site. With the login or password unset the stand stays shut
export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER
  const password = process.env.BASIC_AUTH_PASSWORD
  const robots = process.env.ROBOTS_TAG ? { "X-Robots-Tag": process.env.ROBOTS_TAG } : {}
  // PUBLIC_ACCESS=1 opens the stand without the password: an exception Almaz set on 20 Nov 2026 with the
  // CTO's and the client's approval (Playground/CLAUDE.md). The robots header stays. Unset it and the password is back
  const open = process.env.PUBLIC_ACCESS === "1"

  const header = request.headers.get("authorization") ?? ""
  const [scheme, encoded] = header.split(" ")
  const decoded = scheme === "Basic" && encoded ? atob(encoded) : ""
  const at = decoded.indexOf(":")
  const signedIn = !!user && !!password && at !== -1 && decoded.slice(0, at) === user && decoded.slice(at + 1) === password
  if (open || signedIn) {
    // The root opens the prototype, on Desktop: the link is shared with people who open it on a
    // laptop, and without a view the prototype starts on Phone. It's here, not in vercel.json,
    // since those redirects run before the middleware and would answer a stranger without the password
    if (new URL(request.url).pathname === "/") return new Response(null, { status: 307, headers: { Location: "/prototype/tutorial-v2/?view=desktop", ...robots } })
    return next({ headers: robots })
  }

  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Playground prototype Oak", charset="UTF-8"', "Cache-Control": "no-store", ...robots },
  })
}

export const config = { matcher: "/:path*" }
