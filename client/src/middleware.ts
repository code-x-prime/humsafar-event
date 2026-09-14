import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Canonicalizes the host: any request arriving on the "www." subdomain (over
// http or https) is 301-redirected to the bare apex domain, so
// https://www.humsafarevent.com/anything and http://www.humsafarevent.com/
// both land on https://humsafarevent.com/anything instead of serving
// duplicate content under two hostnames. Only runs on the www check — actual
// http->https upgrading and DNS for www must still be handled by the reverse
// proxy / DNS in front of this app for requests that never reach it.
export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.host = host.slice(4);
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and Next internals — no reason to run host-checking
  // middleware on every JS chunk/image request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
