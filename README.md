# GitHub / Vercel package

## Local setup
1. Put your Supabase URL and public anon/publishable key in `config.js`.
2. Open `index.html` through a local static server (or deploy to Vercel).
3. Do not add a service_role/secret key.

## Deploy
Push this folder to GitHub, then import the repository into Vercel.
This is a static site, so no build command is required.

## Important
`config.js` is intentionally a placeholder. The Supabase public key is designed for browser use when RLS policies enforce the intended access. This assignment has no login, so the policies are public by design.
