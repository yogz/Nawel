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
    // Public profile handles: `sortie.colist.fr/@bob` → internal
    // `/sortie/profile/bob`. We can't use a `@`-prefixed folder name because
    // Next.js reserves that for parallel route slots, so we rewrite instead.
    if (pathname.startsWith("/@") && pathname.length > 2) {
      const username = pathname.slice(2).split("/")[0]!;
      const target = `/sortie/profile/${encodeURIComponent(username)}`;
      const response = NextResponse.rewrite(new URL(`${target}${search}`, request.url));
      response.headers.set("x-app", "sortie");
      return response;
    }

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
  //
  // NOTE: we deliberately do NOT skip prefetch requests. The sortie host
  // relies on this proxy to rewrite `/@user` and `/moi` to their internal
  // routes — if prefetches bypass the proxy they resolve as 404 on the
  // `/[locale]/...` tree and Vercel caches those 404s, breaking subsequent
  // real navigations.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
