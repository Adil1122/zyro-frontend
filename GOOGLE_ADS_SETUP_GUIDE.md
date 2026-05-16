# Google Ads Integration Setup Guide

## Overview
This guide will help you set up Google Ads integration in your Zyro application to fetch campaign data using GAQL queries, spending, revenue, ROAS, conversions, and track UTM parameters.

## Prerequisites
- Google Cloud Platform (GCP) Account
- Google Ads Account with active campaigns
- Google Developer Token (requires approval)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Ads API:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Ads API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Configure authorized redirect URIs:
   - `http://localhost:3000/api/google-ads/callback` (development)
   - `https://yourdomain.com/api/google-ads/callback` (production)
5. Copy the Client ID and Client Secret

## Step 3: Get Google Ads Developer Token

1. Go to [Google Ads Center](https://ads.google.com/home/tools/manager-accounts/)
2. Navigate to "Tools & Settings" → "API Center"
3. Apply for a developer token (requires approval process)
4. Wait for token approval (can take 24-48 hours)
5. Copy your developer token

## Step 4: Update Environment Variables

Create `.env.local` file in your project root:

```env
# OAuth Configuration (for redirect URIs)
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-ads/callback

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Database Setup

Run the database migration scripts in order:

1. `database_updates_google_ads.sql`
2. `database_updates_utm_tracking.sql`

```bash
# Run in your Supabase SQL editor
# Copy and paste the contents of each file
```

## Step 6: Test the Integration

1. Start your application: `npm run dev`
2. Navigate to Marketing page
3. Click "API Credentials" button
4. Enter your Google Ads credentials:
   - Client ID
   - Client Secret
   - Developer Token
5. Click "Save Credentials"
6. Click "Connect Google Ads" button
7. Complete the OAuth flow in the popup
8. Select your Google Ads Customer Account when prompted

## Step 7: UTM Parameter Tracking

The system automatically tracks UTM parameters from ad clicks:

### Facebook Ads URLs:
```
https://yourstore.com?utm_source=facebook&utm_campaign=eid_sale&fbclid=ABC123
```

### Google Ads URLs:
```
https://yourstore.com?utm_source=google&utm_campaign=summer_sale&gclid=XYZ789
```

### Tracking Implementation:
- UTM parameters are captured automatically when users land on your site
- Parameters are stored in localStorage and attached to orders
- gclid and fbclid are tracked for click attribution
- Revenue is attributed to the correct ad platform

## GAQL Queries

The system uses Google Ads Query Language (GAQL) to fetch campaign data:

### Example Query Used:
```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign.advertising_channel_type,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions,
  metrics.ctr,
  metrics.average_cpc,
  metrics.conversion_rate,
  segments.date
FROM campaign
WHERE segments.date DURING LAST_7_DAYS
AND campaign.status != 'REMOVED'
```

### Supported Date Ranges:
- `LAST_7_DAYS`
- `LAST_30_DAYS`
- `LAST_90_DAYS`

## API Endpoints Created

### OAuth Flow
- `GET /api/google-ads/auth` - Initiates OAuth flow
- `GET /api/google-ads/callback` - Handles OAuth callback

### Data Fetching
- `GET /api/google-ads/accounts` - Lists Google Ads accounts
- `GET /api/google-ads/stats` - Fetches campaign statistics using GAQL
- `POST /api/google-ads/accounts` - Selects customer account

### UTM Tracking
- `POST /api/tracking/utm` - Stores UTM tracking events

### Credentials Management
- `GET /api/user/credentials` - Gets stored credentials status
- `POST /api/user/credentials` - Saves API credentials

## Database Schema

### Users Table (Updated)
```sql
google_ads_client_id text
google_ads_client_secret text
google_ads_developer_token text
google_ads_access_token text
google_ads_refresh_token text
google_ads_token_expires_at timestamp
google_ads_customer_id text
google_ads_connected_at timestamp
google_ads_enabled boolean default false
```

### Google Ads Campaigns Table
```sql
id uuid primary key
user_id uuid references users(id)
campaign_id text not null
campaign_name text
status text
channel_type text
spend decimal(10,2)
impressions integer
clicks integer
conversions decimal(10,2)
ctr decimal(5,2)
avg_cpc decimal(10,2)
conversion_rate decimal(5,2)
created_at timestamp
updated_at timestamp
```

### Orders Table (Updated with UTM)
```sql
utm_source text
utm_medium text
utm_campaign text
utm_term text
utm_content text
gclid text -- Google Click Identifier
fbclid text -- Facebook Click Identifier
```

### UTM Tracking Events Table
```sql
id uuid primary key
event_type text not null
utm_source text
utm_medium text
utm_campaign text
utm_term text
utm_content text
gclid text
fbclid text
page_url text
timestamp timestamp not null
user_agent text
ip_address text
```

## Features Implemented

✅ Google OAuth Authentication Flow
✅ GAQL Query System for Campaign Data
✅ Customer Account Selection
✅ Real-time Campaign Statistics
✅ UTM Parameter Tracking
✅ gclid and fbclid Attribution
✅ Revenue Attribution by Platform
✅ ROAS Calculation
✅ Conversion Tracking
✅ API Credentials Management
✅ Token Refresh Support
✅ Multi-customer Account Support

## UTM Parameter Usage

### Order Attribution:
When orders are created, the system automatically:
1. Captures UTM parameters from the initial visit
2. Stores them in localStorage
3. Attaches them to order data
4. Attributes revenue to the correct platform

### Revenue Calculation:
- **Meta Ads**: Orders with `utm_source=facebook` or `fbclid`
- **Google Ads**: Orders with `utm_source=google` or `gclid`
- **ROAS**: Revenue / Spend per platform

## Troubleshooting

### Common Issues

1. **"Google Ads credentials not configured"**
   - Ensure Client ID, Client Secret, and Developer Token are set in API Credentials
   - Restart your application after adding credentials

2. **"Invalid redirect URI"**
   - Check that GOOGLE_REDIRECT_URI matches your OAuth client configuration
   - Ensure the URI is exactly the same (including http/https)

3. **"Developer token invalid"**
   - Ensure your developer token is approved by Google
   - Check token status in Google Ads API Center

4. **"No customer account selected"**
   - After OAuth, select a customer account from the list
   - Use the POST endpoint to set the selected account

5. **"GAQL query failed"**
   - Check if your Google Ads account has active campaigns
   - Verify API permissions and token validity

### Debug Mode

Add console logging to debug:
```javascript
// In your browser console
localStorage.getItem('utm_params')
```

## Security Notes

- Developer token should be kept secure
- Client secret is never exposed to frontend
- All credentials are stored in encrypted database fields
- OAuth tokens are automatically refreshed
- UTM parameters are stored securely

## Performance Optimization

- Campaign data is cached in database
- GAQL queries use efficient date ranges
- UTM tracking is lightweight and async
- Token refresh is handled automatically

## Future Enhancements

- Advanced GAQL query builder
- Custom date range selection
- Campaign creation and management
- Ad group and keyword analysis
- Automated bid optimization
- Cross-platform attribution modeling

## Testing Checklist

- [ ] Google Cloud project created
- [ ] Google Ads API enabled
- [ ] OAuth credentials created
- [ ] Developer token obtained
- [ ] Database migrations run
- [ ] Environment variables set
- [ ] OAuth flow completes successfully
- [ ] Campaign data appears in dashboard
- [ ] UTM parameters are tracked
- [ ] Revenue attribution works correctly
