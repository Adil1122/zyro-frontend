# Meta Ads Integration Setup Guide

## Overview
This guide will help you set up Meta Ads (Facebook + Instagram) integration in your Zyro application to fetch campaign data, spending, revenue, ROAS, orders, and status details.

## Prerequisites
- Facebook Developer Account
- Meta Business Account
- Ad Account with active campaigns

## Step 1: Create Meta App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app: "Business" app type
3. Add "Marketing API" product
4. Configure app settings:
   - App Domain: `localhost` (for development)
   - Privacy Policy URL: `http://localhost:3000/privacy`
   - Contact Email: Your email

## Step 2: Configure OAuth Redirect

1. In your app dashboard, go to "Products" → "Marketing API" → "Settings"
2. Add redirect URI: `http://localhost:3000/api/meta-ads/callback`
3. Add required permissions: `ads_read`, `business_management`

## Step 3: Get App Credentials

1. From your app dashboard, copy:
   - App ID
   - App Secret

## Step 4: Update Environment Variables

Create `.env.local` file in your project root:

```env
# OAuth Configuration (for redirect URIs)
META_REDIRECT_URI=http://localhost:3000/api/meta-ads/callback

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Note: API credentials are now stored in the database per user, not in environment variables.

## Step 5: Database Setup

Run the database migration scripts in order:

1. `database_updates_meta_ads.sql`
2. `database_updates_meta_ad_accounts.sql`
3. `database_updates_api_credentials.sql`

```bash
# Run in your Supabase SQL editor
# Copy and paste the contents of each file
```

## Step 6: Test the Integration

1. Start your application: `npm run dev`
2. Navigate to Marketing page
3. Click "API Credentials" button
4. Enter your Meta App ID and App Secret
5. Click "Save Credentials"
6. Click "Connect Meta Ads" button
7. Complete the OAuth flow in the popup
8. Select your Ad Account when prompted

## Step 7: View Campaign Data

Once connected, you'll see:
- Real campaign data from Meta Ads
- Spend, revenue, ROAS calculations
- Order tracking (based on your orders data)
- Campaign status and performance metrics

## API Endpoints Created

### OAuth Flow
- `GET /api/meta-ads/auth` - Initiates OAuth flow
- `GET /api/meta-ads/callback` - Handles OAuth callback

### Data Fetching
- `GET /api/meta-ads/accounts` - Lists ad accounts
- `GET /api/meta-ads/stats` - Fetches campaign statistics
- `POST /api/meta-ads/accounts` - Selects ad account

### Credentials Management
- `GET /api/user/credentials` - Gets stored credentials status
- `POST /api/user/credentials` - Saves API credentials

## Database Schema

### Users Table (Updated)
```sql
meta_ads_access_token text
meta_ads_refresh_token text
meta_ads_token_expires_at timestamp
meta_ads_ad_account_id text
meta_ads_business_id text
meta_ads_connected_at timestamp
meta_ads_enabled boolean default false

google_ads_access_token text
google_ads_refresh_token text
google_ads_token_expires_at timestamp
google_ads_customer_id text
google_ads_connected_at timestamp
google_ads_enabled boolean default false
```

### Meta Ads Campaigns Table
```sql
id uuid primary key
user_id uuid references users(id)
campaign_id text not null
campaign_name text
status text
objective text
spend decimal(10,2)
impressions integer
clicks integer
reach integer
created_at timestamp
updated_at timestamp
```

### Meta Ads Stats Table
```sql
id uuid primary key
user_id uuid references users(id)
campaign_id text
date date not null
spend decimal(10,2)
impressions integer
clicks integer
reach integer
revenue decimal(10,2)
orders integer
created_at timestamp
```

## Features Implemented

✅ OAuth Authentication Flow
✅ Ad Account Selection
✅ Campaign Data Fetching
✅ Real-time Statistics
✅ ROAS Calculation
✅ Order Tracking Integration
✅ API Credentials Management
✅ Error Handling
✅ Token Refresh Support

## Troubleshooting

### Common Issues

1. **"Meta App configuration missing"**
   - Ensure META_APP_ID and META_APP_SECRET are set in .env.local
   - Restart your application after adding environment variables

2. **"Invalid redirect URI"**
   - Check that META_REDIRECT_URI matches your app's redirect URI in Facebook Developers
   - Ensure the URI is exactly the same (including http/https)

3. **"No ad account selected"**
   - After OAuth, select an ad account from the list
   - Use the POST endpoint to set the selected account

4. **"Token expired"**
   - The system will automatically handle token refresh
   - If issues persist, reconnect the account

### Debug Mode

Add console logging to debug:
```javascript
// In your browser console
localStorage.getItem('zyro_user')
```

## Security Notes

- App Secret should never be exposed to frontend
- Consider using environment variables for production
- Implement rate limiting for API endpoints
- Regularly rotate access tokens
- Monitor API usage and costs

## Future Enhancements

- Google Ads integration (infrastructure ready)
- Automated campaign optimization
- Advanced analytics dashboard
- Custom date range selection
- Campaign creation and management
- Ad creative analysis
