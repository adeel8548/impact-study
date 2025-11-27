Deployment & Environment Variables

Why this matters
- The server code requires Supabase credentials at build/runtime. Missing env vars will cause prerender/build to fail.

Required variables
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Local development
1. Create a `.env.local` in the project root (this file must NOT be committed):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

2. Start dev server:

```powershell
pnpm install
pnpm dev
```

Vercel (production/preview)
1. Go to your Vercel project → Settings → Environment Variables.
2. Add the three variables above (use values from your Supabase dashboard).
   - `NEXT_PUBLIC_SUPABASE_URL` → public URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` → service role key (keep secret)
3. Redeploy the project.

Troubleshooting
- If deployment fails with a message about missing Supabase variables, confirm they are set for the environment (Preview/Production) and try redeploying.
- Locally, run `node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"` to verify env is loaded.

Security
- Do NOT commit `.env.local` or the service role key to version control. The service role key grants full DB access.
