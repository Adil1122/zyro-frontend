/** @type {import('next').NextConfig} */
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ubgcwvnwyajrhvubkscm.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_KEY = 'sb_publishable_9y01i8BkdMoQnSLl8438UQ_PBcElkxC';
}
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
}
if (!process.env.SUPABASE_KEY) {
  process.env.SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
}

const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
