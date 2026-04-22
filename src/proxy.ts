import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlProxy = createIntlMiddleware(routing);

const SORTIE_HOSTS = new Set([
  "sortie.colist.fr",
  "sortie.localhost:3000",
  "sortie.localhost:3001",
  "sortie.localhost:3100",
]);

function isSortieHost(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  if (SORTIE_HOSTS.has(host)) {
    return true;
  }
  if (
    process.env.NODE_ENV === "development" &&
    request.nextUrl.searchParams.get("host") === "sortie"
  ) {
    return true;
  }
  return false;
}

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isSortieHost(request)) {
    // Route group (sortie)/sortie/* handles these requests. The user sees
    // sortie.colist.fr/<path>, internally Next.js resolves (sortie)/sortie/<path>.
    const target = pathname === "/" ? "/sortie" : `/sortie${pathname}`;
    const response = NextResponse.rewrite(new URL(`${target}${search}`, request.url));
    response.headers.set("x-app", "sortie");
    return response;
  }

  // On the colist host, /sortie/* must never resolve to Sortie content. Redirect
  // such visitors to the proper subdomain so we never leak Sortie routes.
  if (pathname === "/sortie" || pathname.startsWith("/sortie/")) {
    const forwardPath = pathname === "/sortie" ? "/" : pathname.slice("/sortie".length);
    return NextResponse.redirect(new URL(`${forwardPath}${search}`, "https://sortie.colist.fr"));
  }

  return intlProxy(request);
}

export const config = {
  // Match all pathnames except for
  // - ... if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - ... the ones containing a dot (e.g. `favicon.ico`)
  // - ... prefetch requests (next/link background fetches)
  matcher: [
    {
      source: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
