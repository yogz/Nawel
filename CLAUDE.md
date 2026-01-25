# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CoList** - A mobile-first event coordination application for Christmas meals and gatherings. Built with Next.js 16, React 19, TypeScript, PostgreSQL (Drizzle ORM), and Tailwind CSS.

## Commands

```bash
# Development
npm run dev              # Start dev server with Turbo

# Quality checks
npm run lint             # ESLint
npm run lint:fix         # ESLint with auto-fix
npm run format           # Prettier format
npm run typecheck        # TypeScript check
npm run check            # All checks combined

# Testing
npm test                 # Run tests once
npm run test:watch       # Watch mode

# Database (Drizzle)
npm run db:generate      # Generate migrations from schema changes
npm run db:migrate       # Apply migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Open Drizzle Studio GUI
npm run db:seed          # Seed sample data
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── [locale]/        # i18n routing (12 languages, default: fr)
│   └── actions/         # Server Actions (all mutations)
├── features/            # Feature modules (components + hooks)
│   ├── events/
│   ├── meals/
│   ├── items/
│   ├── people/
│   └── ...
├── components/ui/       # Shadcn/Radix primitives
├── lib/                 # Core utilities
│   ├── db.ts           # Drizzle instance
│   ├── sanitize.ts     # Input sanitization (XSS protection)
│   ├── action-utils.ts # createSafeAction wrapper
│   └── ...
├── hooks/               # Shared React hooks
└── i18n/                # next-intl config
drizzle/
├── schema.ts            # Database schema
└── migrations/          # Auto-generated migrations
messages/                # Translations (12 locales)
```

### Key Patterns

**Server Actions**: All mutations use `createSafeAction(schema, handler)` with Zod validation. Schemas defined in `src/app/actions/schemas.ts`.

**Input Sanitization** (`src/lib/sanitize.ts`): Always sanitize user input before database operations:

- `sanitizeText()` - descriptions
- `sanitizeStrictText()` - names/titles
- `sanitizeSlug()` - URL slugs
- `sanitizeEmoji()` - single emoji

**Component Hierarchy**:

- Server Components (default): data fetching, auth checks
- Client Components (`"use client"`): interactivity only
- UI primitives in `src/components/ui/`

**Internationalization**: All user-facing strings must be in `messages/{locale}.json` for all 12 languages. Use `useTranslations()` hook.

### Tech Stack

- **Framework**: Next.js 16 (App Router, Turbo)
- **UI**: Tailwind CSS, Shadcn/ui (Radix), Framer Motion
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Better Auth (magic link + password + Google OAuth)
- **i18n**: next-intl (12 locales)
- **Testing**: Vitest

## Code Standards

- **No `any` type** - use `unknown` or proper generics
- **Mobile-first** - touch targets minimum 44px, use semantic `<button>` elements
- **Accessibility** - `aria-label` on icon buttons, `focus-visible` states
- **Transitions** - use `duration-300` for standard interactions
- **No hardcoded strings** - all text via i18n

## Database Changes

1. Modify `drizzle/schema.ts`
2. Run `npm run db:generate`
3. Review migration in `drizzle/migrations/`
4. Run `npm run db:migrate`
