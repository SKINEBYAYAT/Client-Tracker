# Client Log

A mobile-first React PWA for tracking beauty/salon clients and their visit history, backed by Supabase (auth + database).

## Stack

- **Frontend:** React 18 + Vite
- **Backend/DB:** Supabase (Postgres + Row Level Security + Auth)
- **Icons:** Lucide React

## Running the app

```
npm run dev
```

Runs on port 5000. The "Start application" workflow handles this automatically.

## Environment variables

Set as Replit Secrets:

| Key | Description |
|-----|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Database setup

Run `schema.sql` in the Supabase SQL Editor to create the `clients` and `visits` tables with Row Level Security.

## User preferences

- Keep the existing project structure — single `src/App.jsx` file with all components
