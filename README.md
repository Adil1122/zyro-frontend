# Zyro — Smart Business Dashboard

A full-stack multi-tenant business dashboard built for Pakistani e-commerce sellers. Connects stores, couriers, marketing channels, and customer communication into a single unified platform.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Custom auth via Supabase RPC + localStorage |
| Styling | Tailwind CSS + inline styles (Jade Horizon dark theme) |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Email | Resend |
| PDF | pdf-lib + pdfkit |
| Payments | Stripe, JazzCash, EasyPaisa |
| Deployment | Vercel |

---

## Project Structure

```
zyro-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── signup/         # 4-step signup with email OTP
│   ├── api/                # All API routes (see below)
│   ├── dashboard/          # Main dashboard
│   ├── orders/             # Orders management
│   ├── couriers/           # Courier tracking
│   ├── inventory/          # Inventory & POS
│   ├── customers/          # Customer management
│   ├── marketing/          # Marketing campaigns
│   ├── whatsapp/           # WhatsApp AI
│   ├── settings/           # Settings & integrations
│   ├── plans/              # Subscription plans
│   └── onboarding/         # New user onboarding
├── components/
│   ├── auth/               # Auth UI components
│   └── dashboard/          # Dashboard UI components
│       └── pages/          # Full page components
├── lib/
│   ├── services/           # All external API service files
│   ├── supabase.js         # Supabase client
│   └── auth.js             # Auth helpers
└── public/
```

---

## Features

### Authentication
- 4-step signup: Personal Info → **Email OTP verification** → Password → Business Setup
- Email OTP sent via Resend with branded HTML template
- Login via email or Pakistani phone number
- Google OAuth (one-click signup/login)
- Custom session management via `localStorage`

### E-Commerce Integrations

| Platform | Platform ID | Features |
|---|---|---|
| WooCommerce | 1 | Stats, orders, sync, create order, webhook |
| Daraz | 5 | Stats, orders, sync |
| Shopify | 6 | Stats, orders |

### Courier Integrations

| Courier | Platform ID | Features |
|---|---|---|
| PostEx | 2 | Stats, orders, sync, create order, PDF label |
| TCS | 3 | Stats, orders, sync, create order, track, cities |
| Leopards | 4 | Stats, orders, sync, create order, track, cities |
| M&P Courier | 7 | Stats, orders, sync, create order |
| Pakistan Post (TrackingMore) | 8 | Tracking only (add/view trackings) |
| DHL Express | 9 | Stats, orders, sync, create order, rates |
| InstaWorld | — | Stats, orders |

### Marketing
- Meta Ads integration (OAuth, stats, campaigns)
- Google Ads integration (OAuth, stats, accounts)
- UTM tracking
- Campaign management

### Other
- WhatsApp AI (automated order confirmations, webhook)
- Inventory management with POS, suppliers, movements, returns
- Customer management
- Subscription plans (Stripe + local payment gateways)
- Dashboard analytics (orders, revenue, COD stats)

---

## API Routes

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Generate & email OTP for signup verification |
| POST | `/api/auth/verify-otp` | Verify OTP code |

### WooCommerce
| Method | Route | Description |
|---|---|---|
| GET | `/api/woocommerce/stats` | Today's orders, revenue, pending orders |
| GET | `/api/woocommerce/orders` | Paginated order list with filters |
| POST | `/api/woocommerce/sync` | Sync orders to Supabase |
| POST | `/api/woocommerce/webhook` | Receive live order events from WooCommerce |

### Couriers (PostEx / TCS / Leopards / M&P / DHL)
Each courier follows the same pattern:

| Method | Route | Description |
|---|---|---|
| GET | `/api/{courier}/stats` | Live stats from courier API |
| GET | `/api/{courier}/orders` | Orders from Supabase (platform_id filtered) |
| POST | `/api/{courier}/sync` | Verify connection, upsert couriers row |
| POST | `/api/{courier}/create-order` | Book shipment + save to Supabase |

### Pakistan Post (TrackingMore)
| Method | Route | Description |
|---|---|---|
| GET | `/api/trackingmore/stats` | Tracking counts |
| GET/POST | `/api/trackingmore/trackings` | List or add Pakistan Post trackings |

### Daraz
| Method | Route | Description |
|---|---|---|
| GET | `/api/daraz/stats` | Orders & revenue (last 90 days) |
| GET | `/api/daraz/orders` | Paginated order list |
| POST | `/api/daraz/sync` | Verify connection + upsert couriers row |

### Marketing
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/meta-ads/*` | Meta Ads OAuth, stats, accounts |
| GET/POST | `/api/google-ads/*` | Google Ads OAuth, stats, accounts |
| GET/POST | `/api/marketing` | Campaign management |
| POST | `/api/tracking/utm` | UTM tracking events |

### Other
| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard-stats` | Aggregated dashboard metrics |
| GET/POST | `/api/orders` | Unified orders across all platforms |
| GET/POST | `/api/customers` | Customer CRUD |
| GET/POST | `/api/inventory` | Inventory management |
| GET/POST | `/api/whatsapp` | WhatsApp AI messages |
| POST | `/api/whatsapp/webhook` | WhatsApp incoming message webhook |
| POST | `/api/payments/stripe` | Stripe payment processing |
| POST | `/api/payments/jazzcash` | JazzCash payments |
| POST | `/api/payments/easypaisa` | EasyPaisa payments |

---

## Database Schema (Supabase)

### Core Tables
```sql
users           -- Multi-tenant root. All data is scoped by user_id.
orders          -- Unified orders table (all platforms + couriers)
customers       -- Customer profiles
couriers        -- Connected courier accounts per user
products        -- Inventory items
otp_verifications -- Temporary OTP codes for email verification
```

### Key `users` Table Columns
```sql
-- Identity
id, name, email, password, phone, business_name, niche, channels

-- WooCommerce
wc_store_url, wc_consumer_key, wc_consumer_secret

-- Courier credentials (per user)
postex_api_key
tcs_api_key, tcs_account_number
leopards_api_key, leopards_api_password
mp_username, mp_password
trackingmore_api_key
dhl_api_key, dhl_api_secret, dhl_account_number

-- Marketing
meta_app_id, meta_app_secret, meta_ads_enabled
google_ads_client_id, google_ads_client_secret, google_ads_developer_token

-- Subscription
subscription_status, trial_ends_at

-- Onboarding
onboarding_completed, onboarding_step
```

### Platform IDs
```
1 = WooCommerce
2 = PostEx
3 = TCS
4 = Leopards
5 = Daraz
6 = Shopify
7 = M&P Courier
8 = Pakistan Post (TrackingMore)
9 = DHL Express
```

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key

# WooCommerce
WC_STORE_URL=https://yourstore.com
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...

# Daraz
DARAZ_APP_KEY=your_app_key
DARAZ_APP_SECRET=your_app_secret
DARAZ_ACCESS_TOKEN=your_access_token
DARAZ_REGION=pk

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...

# PostEx
POSTEX_API_KEY=your_postex_api_key

# InstaWorld
INSTAWORLD_API_KEY=your_instaworld_api_key

# Resend (Email OTP)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Zyro <onboarding@resend.dev>

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-ads/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** TCS, Leopards, M&P, TrackingMore, and DHL credentials are stored **per user** in the `users` Supabase table — not in environment variables.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- Resend account (for OTP emails)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/zyro-frontend.git
cd zyro-frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Fill in your credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database Setup

Run these SQL statements in your Supabase SQL editor:

```sql
-- OTP verification table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE otp_verifications DISABLE ROW LEVEL SECURITY;

-- Courier credential columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trackingmore_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_api_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_account_number TEXT;
```

---

## Courier API Credentials Guide

| Courier | How to Get Credentials |
|---|---|
| **PostEx** | [merchant.postex.pk](https://merchant.postex.pk) → Settings → API Credentials |
| **TCS** | Email ecommerce@tcs.com.pk — request API Integration |
| **Leopards** | Email it@leopardscourier.com or ask your account manager |
| **M&P** | Email support@moveandpick.com — request GFS API access |
| **Pakistan Post** | Sign up at [trackingmore.com](https://trackingmore.com) → get API key (free: 100/month) |
| **DHL Express** | [developer.dhl.com](https://developer.dhl.com) → Create App → subscribe to MyDHL API |
| **InstaWorld** | [portal.instaworld.pk](https://portal.instaworld.pk) → Settings → API Management |
| **Daraz** | [open.daraz.com](https://open.daraz.com) → Create App → Self Authorization |
| **Shopify** | Shopify Admin → Settings → Apps → Develop Apps |

---

## WooCommerce Webhook Setup

1. WooCommerce Admin → **Settings → Advanced → Webhooks → Add Webhook**
2. Delivery URL: `https://yourdomain.com/api/woocommerce/webhook`
3. Secret: add to env as `WC_WEBHOOK_SECRET`
4. Topic: `Order created`
5. Save

---

## Design System

The app uses the **Jade Horizon** dark color palette:

```
Background:  #0A1C16
Card:        #122720
Elevated:    #17332A
High:        #1D4033
Jade:        #5CA87C
Text:        #F0FDF4
Text Muted:  #A7F3D0
Green:       #4ADE80
Yellow:      #FBBF24
Red:         #F87171
Blue:        #60A5FA
```

---

## Deployment

Deployed on **Vercel**. Add all environment variables in:
Vercel Dashboard → Project → Settings → Environment Variables

```bash
npm run build   # Build for production
npm start       # Start production server
```

---

## License

Private — All rights reserved © 2026 Zyro Technologies
