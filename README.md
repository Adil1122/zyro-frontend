# Zyro - Unified AI Commerce OS

Pakistan's first AI Commerce OS dashboard. This is a unified Next.js 14 application containing both the frontend dashboard and the backend API (integrated via Next.js API Routes).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure Environment
# Create a .env.local file with:
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_key

# 3. Start dev server
npm run dev

# 4. Open in browser
# http://localhost:3000
```

## Project Structure

```
zyro-frontend/
├── app/
│   ├── api/               # Unified API Routes (Inventory, Customers, Orders, etc.)
│   ├── layout.js          # Root layout + font loading
│   └── page.js            # Entry point
├── components/
│   └── dashboard/         # Modular Dashboard components
├── lib/
│   ├── services/          # Backend logic (Supabase interactions)
│   └── supabase.js        # Supabase client configuration
├── scripts/               # Database maintenance and seeding scripts
├── public/                # Static assets (logos, favicons)
├── .env.local             # Local environment variables (Git ignored)
├── package.json
└── next.config.js
```

## Features

- **Unified Architecture**: Frontend and Backend in a single project, ready for Vercel.
- **Deep Integration**: Direct connection to Supabase for live data.
- **AI Automation**: WhatsApp Command Center with Bot + Support handoff.
- **Smart Logistics**: Courier tracking with dynamic status updates and COD management.
- **Full CRM**: Customer management with lifetime value and risk tracking.
- **Inventory Control**: Real-time stock alerts and SKU tracking.

## Deployment (Vercel)

1. Connect your Github repository to Vercel.
2. Add `SUPABASE_URL` and `SUPABASE_KEY` to Vercel environment variables.
3. Vercel will build and deploy automatically.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **UI**: React 18 with custom Premium Design tokens.
- **Charts**: Recharts 2.12
- **Analytics**: Built-in Meta Ads campaign tracking.

---
© 2026 Zyro. Built for the future of commerce in Pakistan.
