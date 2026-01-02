# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your CoList event planning application. This integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js 16+ approach)
- **Server-side PostHog client** for server components and API routes
- **User identification** on login/signup with email as the distinct ID
- **13 custom events** tracking key user actions across the application
- **Automatic exception tracking** via `capture_exceptions: true`
- **Environment variable configuration** for secure API key management

## Events Implemented

| Event Name                     | Description                                                                             | File Path                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `event_created`                | User creates a new event - key conversion event for event organizers                    | `src/app/[locale]/create-event/create-event-client.tsx`      |
| `event_shared`                 | User shares an event via copy link, WhatsApp, or native share - engagement metric       | `src/features/events/components/share-modal.tsx`             |
| `user_signed_in`               | User signs in via email or Google - authentication conversion                           | `src/components/auth/login-form.tsx`                         |
| `user_signed_up`               | User creates a new account via email - key conversion for user acquisition              | `src/components/auth/login-form.tsx`                         |
| `person_claimed_profile`       | User claims an existing guest profile - conversion from anonymous to authenticated      | `src/features/auth/components/claim-person-sheet.tsx`        |
| `guest_continued_without_auth` | Guest chooses to continue without signing in - measures auth friction                   | `src/features/auth/components/guest-access-sheet.tsx`        |
| `item_assigned`                | User assigns an item to a person - core engagement action for event collaboration       | `src/features/items/hooks/use-item-handlers.ts`              |
| `item_created`                 | User adds a new item to a service - engagement metric for event planning                | `src/features/items/hooks/use-item-handlers.ts`              |
| `application_error`            | Application error occurred - reliability monitoring                                     | `src/app/[locale]/error.tsx`                                 |
| `shopping_list_viewed`         | User views their shopping list - engagement metric for shopping feature                 | `src/app/[locale]/event/[slug]/shopping/[personId]/page.tsx` |
| `event_joined`                 | Authenticated user joins an event as a participant - conversion for event collaboration | `src/app/actions/person-actions.ts`                          |
| `user_deleted_account`         | User deletes their account - churn indicator for retention analysis                     | `src/app/actions/user-actions.ts`                            |
| `event_deleted`                | User deletes an event - churn indicator for event engagement                            | `src/app/actions/event-actions.ts`                           |

## Files Created/Modified

### Modified Files (This Session)

- `.env` - Added PostHog environment variables
- `src/features/items/hooks/use-item-handlers.ts` - Added `item_created` event tracking
- `src/app/actions/user-actions.ts` - Added `user_deleted_account` event tracking (server-side)
- `src/app/actions/event-actions.ts` - Added `event_deleted` event tracking (server-side)
- `src/app/actions/person-actions.ts` - Added `event_joined` event tracking (server-side)

### Previously Configured Files

- `instrumentation-client.ts` - Client-side PostHog initialization
- `src/lib/posthog-server.ts` - Server-side PostHog client
- `.env.local` - PostHog environment variables
- `.env.example` - PostHog configuration documentation
- `src/components/auth/login-form.tsx` - User identification and sign-in/sign-up tracking
- `src/app/[locale]/create-event/create-event-client.tsx` - Event creation tracking
- `src/features/events/components/share-modal.tsx` - Share event tracking
- `src/features/auth/components/claim-person-sheet.tsx` - Profile claim tracking
- `src/features/auth/components/guest-access-sheet.tsx` - Guest continuation tracking
- `src/app/[locale]/error.tsx` - Application error tracking
- `src/app/[locale]/event/[slug]/shopping/[personId]/page.tsx` - Shopping list view tracking (server-side)

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard

- [Analytics basics](https://eu.posthog.com/project/112117/dashboard/472953) - Your main analytics dashboard with core business metrics

### Insights

- [Signup to Event Creation Funnel](https://eu.posthog.com/project/112117/insights/34ocfEDt) - Conversion funnel from user signup to event creation to event sharing
- [Daily Active Events](https://eu.posthog.com/project/112117/insights/WHUWSsO6) - Track key user actions (event creation, item creation, item assignment) over time
- [Churn Indicators](https://eu.posthog.com/project/112117/insights/2iP6avfv) - Monitor account and event deletions as indicators of user churn
- [User Authentication Overview](https://eu.posthog.com/project/112117/insights/8OVUjymk) - Track sign-in and sign-up events to monitor user acquisition
- [Event Collaboration Funnel](https://eu.posthog.com/project/112117/insights/smHtsErZ) - Journey from event sharing to user joining and engaging with items

## Environment Variables

Make sure these environment variables are set in your production environment:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_p1RciJLPQBMJBFeadVbBMmtyfQu6aay6Db7ap8nTm98
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```
