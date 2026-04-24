# Deploying Zyro to Vercel

This project is a unified Next.js 14 application with a built-in API.

## 1. Environment Variables
You must set the following environment variables in your Vercel Project Settings:

*   `SUPABASE_URL`: Your Supabase project URL (e.g., https://xyz.supabase.co)
*   `SUPABASE_KEY`: Your Supabase service role or anon key.

## 2. Deployment Steps
1.  Push this project to a GitHub repository.
2.  Import the repository into Vercel.
3.  Vercel will automatically detect Next.js.
4.  Add the environment variables mentioned above.
5.  Click **Deploy**.

## 3. Local Development
Run `npm run dev` to start the dashboard and API on `localhost:3000`.
