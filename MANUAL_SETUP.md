# WooCommerce Integration - Manual Database Setup

## Issue: Sync Button Not Visible

The Sync button is not showing because your database is missing the required WooCommerce schema.

## Solution: Run Database Setup

You need to execute the SQL commands in `setup_woocommerce_columns.sql` to add the missing tables and columns.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `setup_woocommerce_columns.sql`
4. Click **Run** to execute the SQL

### Option 2: Using psql (if you have direct database access)

```bash
psql -h your-db-host -U postgres -d your-database -f setup_woocommerce_columns.sql
```

## What the Setup Does

The SQL script will:
- Add WooCommerce credential columns to `users` table:
  - `wc_store_url`
  - `wc_consumer_key` 
  - `wc_consumer_secret`
- Create `customers` table for storing customer data
- Create `products` table for storing product inventory
- Create `orders` table for storing order data
- Add necessary indexes for performance

## After Setup

Once the database schema is set up:

1. **Configure WooCommerce credentials** in Settings → Connected Stores → WooCommerce → Configuration
2. **Sync button will appear** next to the Manage button
3. **Click Sync** to fetch and insert data from WooCommerce

## Expected Behavior

- ✅ Sync button only appears when WooCommerce is configured
- ✅ Clicking Sync connects to WooCommerce and fetches data
- ✅ New records are inserted, existing records are updated
- ✅ You'll see sync statistics showing inserted/updated counts

## Troubleshooting

If you still don't see the Sync button after running the setup:

1. Check browser console for any JavaScript errors
2. Verify WooCommerce credentials are saved correctly
3. Refresh the Settings page
4. Check that all three WooCommerce credential columns exist in the users table
