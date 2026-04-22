import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlProxy = createIntlMiddleware(routing);

const SORTIE_HOSTS = new Set([
  "sortie.colist.fr",
  "sortie.localhost:3000",
  "sortie.localhost:3001",
]);

function isSortieHost(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  if (SORTIE_HOSTS.has(host)) return true;
  if (
    process.env.NODE_ENV === "development" &&
    request.nextUrl.searchParams.get("host") === "sortie"
  ) {
    return true;
  }
  return false;
}

export default function proxy(request: NextRequest) {
  if (isSortieHost(request)) {
    const { pathname, search } = request.nextUrl;
    const target = pathname === "/" ? "/__sortie" : `/__sortie${pathname}`;
    const response = NextResponse.rewrite(new URL(`${target}${search}`, request.url));
    response.headers.set("x-app", "sortie");
    return response;
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
      source: "/((?!api|trpc|_next|_vercel|__sortie|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
