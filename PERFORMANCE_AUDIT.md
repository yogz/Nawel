# Mobile Performance Audit: CoList

**Date:** January 12, 2026
**Auditor:** Cross-functional Panel (UX, Performance, Architecture, Network, A11y)

---

## Panel Assessment

### 1. User Journey First (Perceived Performance)

**What the user sees in the first 1-2 seconds:**

| Time        | Experience                                 |
| ----------- | ------------------------------------------ |
| 0-500ms     | White screen (SSR + JS download)           |
| 500-800ms   | Blank white div (A/B test variant loading) |
| 800-1500ms  | Hero image loading, text appears           |
| 1500-2500ms | Framer Motion animations complete          |

**Layout Stability:** Poor. The landing router renders a blank `<div className="min-h-screen bg-white" />` until localStorage is read for A/B variant, causing a **full-screen content shift**.

**Skeleton Usage:** Minimal. The event page has a simple pulse skeleton, but landing pages show nothing.

**Scroll/Tap Lag:** Moderate risk due to:

- Continuous CSS animation (`aurora-mesh` 20s loop with transforms)
- Snow overlay canvas with 450 particles on every frame
- Scroll-linked Framer Motion transforms on hero

**"Feels Fast / Feels Slow" Diagnosis: FEELS SLOW**

- Blank screen during A/B variant determination
- 400-600KB unoptimized hero images
- Gratuitous animations that don't serve comprehension
- Heavy JS bundle from framer-motion + radix + recharts

---

### 2. Core Web Vitals Assessment

| Metric   | Estimated  | Target | Impact                                    |
| -------- | ---------- | ------ | ----------------------------------------- |
| **LCP**  | ~3.5-4.5s  | <2.5s  | Hero image (519KB PNG) + A/B blank flash  |
| **INP**  | ~150-250ms | <200ms | Framer Motion scroll handlers + analytics |
| **CLS**  | ~0.15-0.25 | <0.1   | A/B variant flash, font loading           |
| **TTFB** | ~200-400ms | <200ms | Acceptable (Vercel Edge)                  |

**LCP Element:** The hero `<Image>` at `/alt_hero.png` (519KB). Despite using `priority` and `fetchPriority="high"`, the source image is:

- PNG format (not AVIF/WebP at source)
- 519KB uncompressed
- Only converted on-demand by Next.js Image Optimization

**INP Issues:**

- `useScroll` from Framer Motion fires on every scroll frame
- Analytics events (`sendGAEvent`, `trackDemoStep`) on interactions
- The demo component has `setInterval` cycling every 3-4 seconds forever

**CLS Sources:**

1. **A/B Landing Router:** Returns `null` on server, blank div until hydration
2. **Font Loading:** Inter loaded via Google Fonts with variable subset
3. **Theme flash:** Inline script reads localStorage, but body class applied after hydration

---

### 3. Main Thread Health

**Long Tasks Identified:**

| Task                      | Estimated Duration | Trigger             |
| ------------------------- | ------------------ | ------------------- |
| Hydration of landing page | 200-400ms          | Initial load        |
| Framer Motion setup       | 50-100ms           | Component mount     |
| DnD Kit sensors setup     | 30-50ms            | Event page mount    |
| i18n messages parsing     | 20-40ms            | All pages           |
| Analytics initialization  | 30-50ms            | GA + Vercel scripts |

**Hydration Cost:**

- `NextIntlClientProvider` receives ALL messages for ALL 12 languages
- `ThemeProvider` reads localStorage synchronously
- `useLandingVariant` accesses localStorage and URL params

**Scroll Jank Sources:**

1. **Snow Overlay:** Canvas `requestAnimationFrame` loop with 450 snowflake updates
2. **Aurora Animations:** CSS `blur(60px)` filter on animated pseudo-elements
3. **Sticky Hero:** `position: sticky` with scroll-linked opacity/scale transforms

**Time to Interactive:**

- Landing: ~2.5-3.5s (A/B blank + hydration + animations)
- Event Page: ~1.5-2.5s (lazy loading helps, but DnD Kit sensors add cost)

---

### 4. Visual & Content Strategy

**What should load first:**

1. Hero text (value proposition) - currently delayed by A/B
2. Primary CTA button - visible but not interactive until hydration
3. Social proof section - currently below fold

**What can be deferred:**

- Demo interactive section (heavy, auto-animating)
- FAQ accordion
- Language selector popover content
- Snow overlay (Christmas theme only)

**Font Strategy Issues:**

- Inter loaded from Google Fonts (external request)
- CSS variable applied, but `font-display` not explicitly set to `swap`
- Fallback to system-ui is good

**Image Strategy Issues:**

| Image          | Size  | Problem                              |
| -------------- | ----- | ------------------------------------ |
| LogoIcon.png   | 482KB | Used as favicon/icon - way too large |
| favicon.ico    | 432KB | Should be <10KB                      |
| alt_hero.png   | 519KB | Hero LCP element                     |
| aura-ai.png    | 605KB | Feature image                        |
| story_hero.png | 659KB | Largest asset                        |

---

### 5. Network Efficiency

**Request Count (Cold Load):**

- ~15-20 JS chunks
- 12+ translation JSON files potentially
- 4-6 images above fold
- 3+ analytics scripts

**Critical Path:**

1. HTML document
2. Main JS bundle
3. CSS (inlined via Tailwind)
4. Hero image
5. Inter font

**Caching Strategy:**

- Service worker does network-first with no actual caching
- No cache headers configured in Next.js config
- Static assets at `/public` not versioned

**Third-Party Cost:**

| Script                | Size  | Value                   |
| --------------------- | ----- | ----------------------- |
| Google Analytics      | ~45KB | Medium (tracking)       |
| Vercel Analytics      | ~15KB | Low (redundant with GA) |
| Vercel Speed Insights | ~20KB | Medium (monitoring)     |

---

### 6. Accessibility & Resilience

**Performance + A11y Traps:**

1. **Focus jumps** when A/B variant loads (full page re-render)
2. **Snow overlay** uses `aria-hidden` but canvas still consumes resources
3. **Aurora blur animations** may cause vestibular issues
4. **Auto-cycling demo** can't be paused by user

**"Works when things go wrong":**

- Service worker fallback is empty (no offline support)
- No progressive enhancement for JS failures
- Images have no placeholder/blur

---

## Top 10 Issues Ranked by User Impact

### 1. A/B Test Blank Screen Flash (HIGH)

- **UX Symptom:** User sees white screen for 500-800ms before any content
- **Root Cause:** `useLandingVariant` returns `null` on server, blank div until localStorage read
- **Fix:** Use cookie-based A/B variant set on server, or render default variant SSR
- **Expected Gain:** -500ms to first paint, CLS improvement of 0.1+
- **Files:** `src/components/landing/landing-router.tsx`, `src/hooks/use-landing-variant.ts`

### 2. Unoptimized Hero Images (HIGH)

- **UX Symptom:** Slow image loading, delayed LCP by 1-2s
- **Root Cause:** 500-600KB PNG files in `/public` - Next.js converts but still large
- **Fix:** Pre-optimize to AVIF/WebP at 50-80KB, use responsive `srcset`
- **Expected Gain:** LCP improvement of 1-1.5s
- **Files:** `/public/alt_*.png`, `/public/aura-*.png`, `/public/story_*.png`

### 3. Continuous CSS Animations (HIGH)

- **UX Symptom:** Battery drain, scroll jank, GPU overuse on mobile
- **Root Cause:** `aurora-mesh` 20s animation with `blur(60px)` filter always running
- **Fix:** Use `prefers-reduced-motion`, pause when tab not visible
- **Expected Gain:** 20-30% improvement in scroll smoothness
- **Files:** `src/app/globals.css`

### 4. Snow Overlay Canvas (MEDIUM)

- **UX Symptom:** Consistent 16ms main thread work even when not Christmas theme
- **Root Cause:** `requestAnimationFrame` loop runs always, just doesn't draw
- **Fix:** Completely unmount component when theme !== "christmas"
- **Expected Gain:** 5-10ms per frame saved on non-Christmas
- **Files:** `src/components/snow-overlay.tsx`

### 5. Excessive Image Assets in /public (MEDIUM)

- **UX Symptom:** Total page weight 5-8MB for landing
- **Root Cause:** Duplicate images, unoptimized PNGs, 432KB favicon
- **Fix:** Remove duplicates, compress favicon to 32KB, use AVIF
- **Expected Gain:** 60-70% reduction in total transfer size
- **Files:** `/public/*`

### 6. Three Analytics Scripts (MEDIUM)

- **UX Symptom:** 80KB+ JS loaded, 3 network requests blocking
- **Root Cause:** Google Analytics + Vercel Analytics + Vercel Speed Insights
- **Fix:** Choose one (GA4 or Vercel), defer others or remove
- **Expected Gain:** 40-60KB JS reduction, 2 fewer blocking requests
- **Files:** `src/app/[locale]/layout.tsx`

### 7. All Translations Sent to Client (MEDIUM)

- **UX Symptom:** Large hydration payload, slower TTI
- **Root Cause:** `getMessages()` returns all namespaces for locale
- **Fix:** Use selective message loading per page
- **Expected Gain:** 30-50KB reduction in hydration payload
- **Files:** `src/app/[locale]/layout.tsx`, `src/i18n/request.ts`

### 8. Demo Component Never Stops (LOW)

- **UX Symptom:** CPU usage continues after scrolling past demo
- **Root Cause:** `setInterval` with no intersection observer pause
- **Fix:** Pause animation when not in viewport
- **Expected Gain:** CPU savings when demo not visible
- **Files:** `src/components/landing/demo-interactive.tsx`

### 9. Service Worker Does Nothing (LOW)

- **UX Symptom:** No offline support, no caching benefits
- **Root Cause:** Network-first with empty cache fallback
- **Fix:** Implement app shell caching, precache critical assets
- **Expected Gain:** Faster repeat visits, offline resilience
- **Files:** `/public/sw.js`

### 10. Font Display Strategy (LOW)

- **UX Symptom:** Potential FOIT (Flash of Invisible Text)
- **Root Cause:** Google Fonts without explicit `font-display: swap`
- **Fix:** Next.js `next/font` should handle this, verify deployment
- **Expected Gain:** Faster text visibility by 100-200ms
- **Files:** `src/app/[locale]/layout.tsx`

---

## 90-Minute Quick Wins Plan

| Time     | Task                                              | Impact               |
| -------- | ------------------------------------------------- | -------------------- |
| 0-15min  | Fix A/B blank flash: render default variant SSR   | CLS -0.1, FCP -500ms |
| 15-30min | Compress hero images to AVIF 50KB using Squoosh   | LCP -1s              |
| 30-45min | Add `prefers-reduced-motion` to aurora animations | Accessibility, perf  |
| 45-60min | Remove one analytics script (Vercel Analytics)    | -40KB JS             |
| 60-75min | Stop snow overlay when theme !== christmas        | CPU savings          |
| 75-90min | Compress favicon.ico to proper 32KB ICO           | -400KB               |

---

## 1-2 Week Structural Plan

### Week 1: Critical Path

1. **Server-side A/B testing** - Use middleware to set cookie, render correct variant SSR
2. **Image pipeline overhaul** - Pre-optimize all /public assets, implement blur placeholders
3. **Animation audit** - Add motion-reduced mode, pause off-screen animations
4. **Bundle analysis** - Run `@next/bundle-analyzer`, identify largest chunks

### Week 2: Optimization

1. **Code-split landing variants** - Use `next/dynamic` for non-default variant
2. **Selective i18n loading** - Only load messages for current page namespace
3. **Service worker caching** - Cache static assets, app shell
4. **Third-party audit** - Defer non-critical scripts, lazy-load analytics

---

## Final Verdict

**Mobile UX Score: 5/10**

**One-sentence summary:**
Users on mid-range Android wait 2-3 seconds staring at a blank screen while beautiful but expensive animations load, only to have their battery drained by continuous effects they may never notice.

### If You Fix Only 3 Things:

1. **Fix the A/B blank flash** - Render default variant SSR, no blank div
2. **Compress hero images to <80KB AVIF** - This is your LCP element
3. **Add `prefers-reduced-motion` and pause off-screen animations** - Mobile battery and performance

These three changes alone would take your mobile experience from "frustrating" to "acceptable" within a few hours of work.

---

## Implementation Checklist

- [ ] **Issue #1:** Fix A/B blank flash
- [ ] **Issue #2:** Optimize hero images
- [ ] **Issue #3:** Add prefers-reduced-motion
- [ ] **Issue #4:** Conditionally render snow overlay
- [ ] **Issue #5:** Clean up /public duplicates
- [ ] **Issue #6:** Remove redundant analytics
- [ ] **Issue #7:** Selective i18n loading
- [ ] **Issue #8:** Pause demo when off-screen
- [ ] **Issue #9:** Implement proper service worker
- [ ] **Issue #10:** Verify font display strategy
