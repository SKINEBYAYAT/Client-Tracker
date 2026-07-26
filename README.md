# Client Log — setup guide

This app now saves to a real database (Supabase), so your client's data is always
there no matter which device or browser opens it. One login for the business.

## 1. Create the database (free)

1. Go to https://supabase.com → sign up → **New project**.
2. Pick a name and a database password (save that password somewhere safe).
3. Once the project is ready, open **SQL Editor** → **New query**.
4. Paste in everything from `schema.sql` (in this folder) and click **Run**.
   This creates the `clients` and `visits` tables and locks each row to whoever
   is logged in.

## 2. Create her login

1. In Supabase, go to **Authentication** → **Users** → **Add user**.
2. Enter her email and set a password (or use "Send invite" if you want her to
   set her own password by email).
3. That email + password is what she'll use to sign into the app.

## 3. Get your API keys

1. In Supabase, go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon public** key.

## 4. Connect the app to your database

1. Copy `.env.example` to a new file named `.env`.
2. Paste in your Project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 5. Run it locally to test

```
npm install
npm run dev
```
Open the local URL it gives you, sign in with the email/password from step 2,
and confirm you can add a client and a visit.

## 6. Deploy it for real

Push this folder to a GitHub repo, then deploy on **Cloudflare Pages** or
**Vercel** (same as the Skiné site):
- Build command: `npm run build`
- Output directory: `dist`
- Add the two environment variables from step 4 in the host's dashboard
  (Cloudflare Pages: Settings → Environment variables. Vercel: Project →
  Settings → Environment Variables).

Once deployed, send her the live URL. She signs in once, and from then on the
same login shows her data on any device — phone, laptop, doesn't matter,
because it all lives in Supabase now instead of on one device.

## Notes

- Data is private: Row Level Security means only her logged-in account can
  read or write her rows, even if someone else knew your Supabase project URL.
- If you ever want staff to have their own separate logins instead of one
  shared one, that's a small change to the SQL policies — just ask.
