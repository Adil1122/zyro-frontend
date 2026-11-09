/** @type {import('next').NextConfig} */
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_KEY = 'placeholder-anon-key';
}

const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
