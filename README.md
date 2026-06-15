# Coffee

## Local setup

1. Install dependencies:
   - `npm install`
2. Copy env template:
   - `copy .env.example .env.local`
3. Put your Aurora PostgreSQL connection string in `.env.local` as `DATABASE_URL`.
4. Start app:
   - `npm run dev`

## Auth flow added

- Create account: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Logout: `POST /api/auth/logout`
- Remember Me support via session cookie max-age

Tables are auto-created on first auth request (same SQL is in `db/auth-schema.sql`).