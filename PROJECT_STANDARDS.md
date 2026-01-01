# Nawel Project Standards & Guidelines

This document serves as the "Source of Truth" for any code changes in the Nawel project. Follow these strictly to maintain security, performance, and code quality.

## 1. Architecture & Folder Structure

- **Feature-Based**: Use the `src/features/` directory for domain-specific logic.
  - `src/features/<feature>/components`: Specific UI components.
  - `src/features/<feature>/hooks`: Custom hooks for that feature.
- **Server Actions**: All mutations must live in `src/app/actions/`.
- **UI Components**: Generic primitives go in `src/components/ui/`.
- **Logic Separation**: Keep client logic in client components and data fetching in server components.
- **Next.js 16 Middleware**: Use `src/proxy.ts` instead of `middleware.ts` for request interception and routing (standard in Next.js 16).

## 2. Server Actions & Security

- **Strict Validation**: All actions **MUST** use `createSafeAction(schema, handler)`.
- **Schemas**: Define actions schemas in `src/app/actions/schemas.ts`.
- **Sanitization**: Use `src/lib/sanitize.ts` for any user-provided string before database insertion.
  - `sanitizeText`: General descriptions.
  - `sanitizeStrictText`: Names and titles.
  - `sanitizeSlug`: Event slugs.
  - `sanitizeEmoji`: Single emojis.
- **Error Handling**: Wrap query-only actions in `withErrorThrower` from `@/lib/action-utils`.

## 3. Type Safety

- **No `any`**: The use of `any` is strictly prohibited. Use `unknown` or proper generic types.
- **Zod Integration**: Leverage Zod types for end-to-end type safety from form to database.

## 4. UI/UX & Aesthetics

- **Premium Design**: Maintain the "WOW" factor. Use gradients, glassmorphism, and micro-animations defined in `globals.css`.
- **Mobile First**: All UI must be perfectly responsive and usable on small touch screens.
- **Interaction Patterns**:
  - Use `Drawer` (`@/components/ui/drawer`) for forms and secondary actions on mobile. It provides a native-like gesture experience (swipe-to-close) powered by **Vaul**.
  - Use `Sheet` (`@/components/ui/sheet`) for side menus or desktop sideboards.
  - Use `SuccessToast` for user feedback.
  - **Auto-Save**: Prefer auto-save patterns (with debounce) for complex forms over manual "Save" buttons.

## 5. Accessibility (A11y)

- **Labeling**: Every input must have a `<Label>` or an `aria-label`.
- **Focus**: Ensure `:focus-visible` styles are respected (handled in `globals.css`).
- **Icons**: Icon-only buttons must have an `aria-label`.

## 6. Testing

- **Vitest**: Unit tests for core logic go in `*.test.ts`.
- **Critical Paths**: Always test sanitization and action-utility logic.

## 7. Performance

- **Client/Server Boundary**: Minimize `"use client"` usage. Only leaf components or interactive containers should be client-side.
- **Damping**: Use reasonable damping/spring physical properties in `framer-motion` to keep animations feeling "premium" but not sluggish.
