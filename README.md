# GitHub / Vercel package

## Local setup
1. Put your Supabase URL and public anon/publishable key in `config.js`.
2. Open `index.html` through a local static server (or deploy to Vercel).
3. Do not add a service_role/secret key.

## Deploy
Push this folder to GitHub, then import the repository into Vercel.
This is a static site, so no build command is required.

## Important
`config.js` is intentionally a placeholder. The Supabase public key is designed for browser use when RLS policies enforce the intended access.

## Auth setup (assignment 7)

1. Run `sql/007-add-auth.sql` once in the Supabase SQL Editor (adds a `user_id` column to every table).
2. In Supabase Dashboard → Authentication → Providers → Email, you can turn off "Confirm email" for this personal single-user project so sign-up logs you in immediately (otherwise you must click the confirmation link Supabase emails you before your first login works).
3. Deploy / open the app, sign up once, and the app will automatically move any existing (owner-less) rows from assignment 6 into your new account.
4. Only after step 3 (so every row already has a `user_id`), run `sql/008-rls.sql` once in the SQL Editor. This turns on Row Level Security so the database itself refuses to return, insert, update, or delete another account's rows — this is what card 4 tests.
5. Account deletion (card 5): the "계정 및 모든 자료 삭제" button on the home screen deletes all of that user's rows client-side (RLS lets a user delete their own rows). The Supabase Auth login record itself isn't deletable from the browser without a service-role key, so the button signs the user out afterward and the page explains that the login record is removed separately from the Supabase dashboard.
