# Christmas Organizer

Mobile-first Christmas meal organizer built with Next.js, Tailwind CSS, Drizzle ORM, and SQLite. Share a link with your family to coordinate meals, see unassigned items, and filter responsibilities by person. All write operations require the shared `WRITE_KEY` query parameter.

## UX & feature plan

- **Mobile-first**: touch-friendly cards, bottom navigation tabs, swipe gestures for day navigation and quick actions, drag-and-drop item reordering, and bottom-sheet forms.
- **Tabs**: Planning (by day), Unassigned, People, Settings.
- **Themes**: neutral default with optional subtle 🎄 accents using CSS variables.
- **Write protection**: `?key=...` required for edits; otherwise the UI is read-only with a banner.

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Créer le fichier .env (déjà fait pour toi avec la clé par défaut `noel2024`) :
   ```bash
   cp .env.example .env
   # WRITE_KEY=noel2024
   ```
3. Run migrations:
   ```bash
   pnpm db:migrate
   ```
4. Seed sample data:
   ```bash
   pnpm db:seed
   ```
5. Start the app:
   ```bash
   pnpm dev
   ```
6. Open `http://localhost:3000/noel/family` (append `?key=YOUR_WRITE_KEY` to edit).

## Database

- SQLite with Drizzle ORM.
- Schema in `drizzle/schema.ts` with relations for days → meals → items and people assignments.
- Migrations live in `drizzle/migrations/` (pre-generated) and are driven by `drizzle.config.ts`.
- Seed script inserts two days, multiple meals, people, and items.

## Deploying on Vercel

1. Set environment variables in Vercel Project Settings:
   - `WRITE_KEY`: shared secret required for writes.
   - `DATABASE_PATH`: e.g. `/tmp/sqlite.db` for ephemeral SQLite during preview.
2. **SQLite in production**: for durability, use a hosted SQLite-compatible service like **Turso**.
   - Create a Turso database and generate a token.
   - Set `DATABASE_PATH` to the libsql URL (e.g., `libsql://<db>.turso.io`) and install the `@libsql/client` adapter if migrating off local SQLite.
   - Run migrations via CI or locally against the remote database before deploying.
3. Deploy with:
   ```bash
   pnpm install
   pnpm db:migrate
   pnpm build
   ```

## Project structure

- `app/` – Next.js App Router pages and server actions.
- `components/` – UI components (planning UI, tabs, bottom sheets).
- `lib/` – database client, queries, and auth helpers.
- `drizzle/` – database schema and migrations.
- `db/` – seed script.
