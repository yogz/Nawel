# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Nawel event planning application. This integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js 16+ approach)
- **Server-side PostHog client** for server components and API routes
- **User identification** on login/signup with email as the distinct ID
- **12 custom events** tracking key user actions across the application
- **Automatic exception tracking** via `capture_exceptions: true`
- **Environment variable configuration** for secure API key management

## Events Implemented

| Event Name                     | Description                                                                                    | File Path                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `event_created`                | User creates a new event/party. Core conversion event for the top of the funnel.               | `src/app/[locale]/create-event/create-event-client.tsx`      |
| `user_signed_up`               | User completes email signup. Key conversion event for user acquisition.                        | `src/components/auth/login-form.tsx`                         |
| `user_signed_in`               | User signs in via email or Google. Engagement metric for returning users.                      | `src/components/auth/login-form.tsx`                         |
| `event_shared`                 | User shares event link via WhatsApp, native share, or copy link. Viral growth metric.          | `src/features/events/components/share-modal.tsx`             |
| `person_joined_event`          | Authenticated user joins an event as a participant. Measures event adoption.                   | `src/components/planning/organizer.tsx`                      |
| `person_claimed_profile`       | User claims an existing guest profile in an event. Conversion from anonymous to authenticated. | `src/features/auth/components/claim-person-sheet.tsx`        |
| `item_assigned`                | An item/dish is assigned to a participant. Core engagement action showing active planning.     | `src/features/items/hooks/use-item-handlers.ts`              |
| `shopping_item_checked`        | User checks off an item in their shopping list. Measures task completion and app utility.      | `src/components/planning/shopping-list-sheet.tsx`            |
| `shopping_list_viewed`         | User opens the full-screen shopping list page. Measures feature adoption.                      | `src/app/[locale]/event/[slug]/shopping/[personId]/page.tsx` |
| `guest_continued_without_auth` | User chooses to continue as guest instead of authenticating. Measures anonymous usage.         | `src/features/auth/components/guest-access-sheet.tsx`        |
| `application_error`            | Application-level error occurred. Track errors for reliability monitoring.                     | `src/app/[locale]/error.tsx`                                 |
| `event_deleted`                | Owner deletes an event. Churn indicator for event lifecycle tracking.                          | `src/components/planning/organizer.tsx`                      |

## Files Created/Modified

### New Files

- `instrumentation-client.ts` - Client-side PostHog initialization
- `src/lib/posthog-server.ts` - Server-side PostHog client

### Modified Files

- `.env.local` - Added PostHog environment variables
- `.env.example` - Added PostHog configuration documentation
- `src/components/auth/login-form.tsx` - User identification and sign-in/sign-up tracking
- `src/app/[locale]/create-event/create-event-client.tsx` - Event creation tracking
- `src/features/events/components/share-modal.tsx` - Share event tracking
- `src/components/planning/organizer.tsx` - Join event and delete event tracking
- `src/features/auth/components/claim-person-sheet.tsx` - Profile claim tracking
- `src/features/items/hooks/use-item-handlers.ts` - Item assignment tracking
- `src/components/planning/shopping-list-sheet.tsx` - Shopping item check tracking
- `src/app/[locale]/event/[slug]/shopping/[personId]/page.tsx` - Shopping list view tracking (server-side)
- `src/features/auth/components/guest-access-sheet.tsx` - Guest continuation tracking
- `src/app/[locale]/error.tsx` - Application error tracking

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard

- [Analytics basics](https://eu.posthog.com/project/112117/dashboard/472890) - Your main analytics dashboard

### Insights

- [Events Created Over Time](https://eu.posthog.com/project/112117/insights/1BwnFCKC) - Track the number of events created daily
- [User Signup to Event Creation Funnel](https://eu.posthog.com/project/112117/insights/bWWKLRGH) - Conversion funnel from signup to first event
- [Event Share Rate](https://eu.posthog.com/project/112117/insights/XUuC19je) - Track viral sharing by method (WhatsApp, native, copy link)
- [User Engagement: Item Assignments](https://eu.posthog.com/project/112117/insights/UwuqYEFc) - Core engagement metric for active planning
- [Authentication Methods](https://eu.posthog.com/project/112117/insights/a4fEPz7B) - Breakdown of sign-in methods (email vs Google)

## Environment Variables

Make sure these environment variables are set in your production environment:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_p1RciJLPQBMJBFeadVbBMmtyfQu6aay6Db7ap8nTm98
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```
