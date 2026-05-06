import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
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

  // Headers de request enrichis avec `x-pathname` pour que les server
  // components puissent lire le path via `headers()` (utilisé par le gate
  // admin pour exempter les pages 2fa-enroll/2fa-challenge du step-up
  // check — sinon redirect-loop). Les options `request: { headers }`
  // passées à NextResponse.{next,rewrite} sont l'API documentée pour
  // forwarder des request headers vers le RSC tree (vs response.headers
  // qui partent au navigateur).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (isSortieHost(request)) {
    // Next.js metadata convention generates OG/Twitter image URLs that
    // already include the `/sortie/` segment (because the asset files live
    // under (sortie)/sortie/.../opengraph-image.tsx and route groups are
    // transparent in URLs — so Next emits e.g. `/sortie/opengraph-image-<hash>`
    // or `/sortie/<slugOrId>/opengraph-image-<hash>`). Re-applying the
    // `/sortie` rewrite below would double-prefix them and 404 the preview
    // — which is what WhatsApp/iMessage/Signal silently swallow. Pass them
    // through so Vercel routes them straight to the file convention.
    if (pathname.includes("/opengraph-image") || pathname.includes("/twitter-image")) {
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.set("x-app", "sortie");
      return response;
    }

    // Public profile handles: `sortie.colist.fr/@bob` → internal
    // `/sortie/profile/bob`. We can't use a `@`-prefixed folder name because
    // Next.js reserves that for parallel route slots, so we rewrite instead.
    if (pathname.startsWith("/@") && pathname.length > 2) {
      const username = pathname.slice(2).split("/")[0]!;
      const target = `/sortie/profile/${encodeURIComponent(username)}`;
      const response = NextResponse.rewrite(new URL(`${target}${search}`, request.url), {
        request: { headers: requestHeaders },
      });
      response.headers.set("x-app", "sortie");
      return response;
    }

    // Route group (sortie)/sortie/* handles these requests. The user sees
    // sortie.colist.fr/<path>, internally Next.js resolves (sortie)/sortie/<path>.
    const target = pathname === "/" ? "/sortie" : `/sortie${pathname}`;
    const response = NextResponse.rewrite(new URL(`${target}${search}`, request.url), {
      request: { headers: requestHeaders },
    });
    response.headers.set("x-app", "sortie");
    return response;
  }

  // On the colist host, /sortie/* must never resolve to Sortie content. Redirect
  // such visitors to the proper subdomain so we never leak Sortie routes.
  if (pathname === "/sortie" || pathname.startsWith("/sortie/")) {
    const forwardPath = pathname === "/sortie" ? "/" : pathname.slice("/sortie".length);
    return NextResponse.redirect(new URL(`${forwardPath}${search}`, "https://sortie.colist.fr"));
  }

  // CoList host : intlProxy crée son propre rewrite vers `/<locale>/...`.
  // Pour propager `x-pathname` au RSC tree on wrappe `request` avec les
  // headers enrichis avant l'appel — `next-intl` se contente de lire
  // request.url (pas les headers custom), donc cette wrap est safe.
  const enrichedRequest = new NextRequest(request, { headers: requestHeaders });
  return intlProxy(enrichedRequest);
}

export const config = {
  // Match all pathnames except for
  // - ... if they start with `/api`, `/trpc`, `/_next` or `/_vercel`
  // - ... the ones containing a dot (e.g. `favicon.ico`)
  //
  // Plus une exception explicite : on REMET dans le matcher tous les
  // paths qui terminent par `.ics`. Le flux iCal personnel
  // `sortie.colist.fr/calendar/<token>.ics` (Apple Calendar exige
  // ce suffixe pour ouvrir le prompt de subscription webcal) passait
  // sinon dans la branche "static asset" du matcher → pas de rewrite
  // → 404. Le path `.ics` matché ici a besoin du proxy pour être
  // réécrit `/calendar/...ics` → `/sortie/calendar/...ics` (route
  // handler dans le route group `(sortie)`).
  //
  // NOTE: we deliberately do NOT skip prefetch requests. The sortie host
  // relies on this proxy to rewrite `/@user` and `/moi` to their internal
  // routes — if prefetches bypass the proxy they resolve as 404 on the
  // `/[locale]/...` tree and Vercel caches those 404s, breaking subsequent
  // real navigations.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)", "/:path*.ics"],
};
