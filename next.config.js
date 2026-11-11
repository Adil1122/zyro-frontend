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

// Central Meta WhatsApp Cloud API credentials
if (!process.env.NEXT_PUBLIC_META_APP_ID) {
  process.env.NEXT_PUBLIC_META_APP_ID = '2070163980283029';
}
if (!process.env.NEXT_PUBLIC_META_CONFIG_ID) {
  process.env.NEXT_PUBLIC_META_CONFIG_ID = '2329644037853553';
}
if (!process.env.META_APP_SECRET) {
  process.env.META_APP_SECRET = 'a097d0e8ca09113d778e727f5b3f75f8';
}
if (!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY) {
  process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = 'a097d0e8ca09113d778e727f5b3f75f8';
}
if (!process.env.META_WEBHOOK_VERIFY_TOKEN) {
  process.env.META_WEBHOOK_VERIFY_TOKEN = 'd625c3f5baa2a2c604b0c7d88554cefd6b5d99ddadedc798d142dbdf6a0efc0e';
}
if (!process.env.META_GRAPH_API_VERSION) {
  process.env.META_GRAPH_API_VERSION = 'v26.0';
}
if (!process.env.META_REDIRECT_URI) {
  process.env.META_REDIRECT_URI = 'https://www.zyroocloud.com/meta-callback';
}
if (!process.env.WA_DEFAULT_PHONE_NUMBER_ID) {
  process.env.WA_DEFAULT_PHONE_NUMBER_ID = '1462001326987017';
}
if (!process.env.WA_DEFAULT_WABA_ID) {
  process.env.WA_DEFAULT_WABA_ID = '1683429933404101';
}
if (!process.env.WA_DEFAULT_MERCHANT_PHONE) {
  process.env.WA_DEFAULT_MERCHANT_PHONE = '+1 (555) 167-0097';
}

const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
