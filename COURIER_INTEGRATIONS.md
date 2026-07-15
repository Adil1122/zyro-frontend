# Courier Integrations — TCS, Leopards, Pakistan Post, DHL & M&P

> **Architecture Note:** All courier integrations follow the same pattern established by the existing PostEx integration. Read `lib/services/postexService.js` and `app/api/postex/` as the reference implementation before building any new courier service.

---

## Table of Contents

1. [Overview & Status](#overview--status)
2. [Architecture Pattern](#architecture-pattern)
3. [Database Schema](#database-schema)
4. [Environment Variables](#environment-variables)
5. [TCS Courier](#1-tcs-courier)
6. [Leopards Courier](#2-leopards-courier)
7. [Pakistan Post](#3-pakistan-post)
8. [DHL Express](#4-dhl-express)
9. [M&P Express Logistics](#5-mp-express-logistics)
10. [Service File Template](#service-file-template)
11. [API Route Template](#api-route-template)
12. [UI Integration](#ui-integration)
13. [Getting API Credentials](#getting-api-credentials)

---

## Overview & Status

| Courier | Public API | Auth Method | Sandbox | Status |
|---|---|---|---|---|
| **TCS** | Yes (portal-gated) | Bearer Token | Yes | To integrate |
| **Leopards** | Yes (documented) | API Key + Password in body | Yes (`enable_test_mode: true`) | To integrate |
| **Pakistan Post** | No direct API | Third-party aggregator | N/A | Use TrackingMore |
| **DHL Express** | Yes (full docs) | HTTP Basic Auth + API Key | Yes (separate URL) | To integrate |
| **M&P** | No public docs | Unknown (request access) | Unknown | Contact required |
| **PostEx** | Yes | Token header | No | ✅ Already integrated |

---

## Architecture Pattern

Every courier follows this exact layered pattern — match it precisely:

```
User Settings UI
      ↓  (saves API key via POST /api/user/credentials)
Supabase users table  (stores [courier]_api_key per user)
      ↓  (retrieved in API route via x-user-id header)
API Route  /api/[courier]/orders|create-order|stats|sync
      ↓  (calls service layer)
lib/services/[courier]Service.js
      ↓  (calls external courier API)
Courier's REST API
      ↓  (normalized response)
Zyro unified order/shipment format
```

### File Structure to Create Per Courier

```
lib/services/
└── [courier]Service.js          # Business logic, API calls, normalization

app/api/
└── [courier]/
    ├── orders/route.js          # GET — list shipments
    ├── create-order/route.js    # POST — book a shipment
    ├── stats/route.js           # GET — KPI stats
    └── sync/route.js            # POST — bulk sync to Supabase (optional)
```

### Normalized Order Format (Zyro Standard)

All courier services must return orders in this shape:

```javascript
{
  id: string,                  // Courier's internal ID or tracking number
  trackingNumber: string,      // CN / tracking number
  orderRefNumber: string,      // Merchant's own order reference
  customerName: string,
  customerPhone: string,       // Always 03xxxxxxxxx format
  deliveryAddress: string,
  cityName: string,
  invoicePayment: number,      // COD amount in PKR (always a number, never string)
  status: string,              // Normalized: 'pending' | 'processing' | 'completed' | 'cancelled' | 'on-hold'
  orderDate: string,           // ISO date string YYYY-MM-DD
  items: number,
  courier: string,             // e.g. 'tcs', 'leopards', 'dhl', 'mp'
  raw: object                  // Original raw response from courier API (keep for debugging)
}
```

---

## Database Schema

### Users Table — Add Credential Columns

Run these in the Supabase SQL editor. Each courier gets its own credential columns:

```sql
-- TCS
ALTER TABLE users ADD COLUMN IF NOT EXISTS tcs_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tcs_api_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tcs_cost_centre_code TEXT;

-- Leopards
ALTER TABLE users ADD COLUMN IF NOT EXISTS leopards_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS leopards_api_password TEXT;

-- DHL
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_api_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dhl_account_number TEXT;

-- M&P
ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_api_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mp_api_password TEXT;

-- Pakistan Post (third-party aggregator)
ALTER TABLE users ADD COLUMN IF NOT EXISTS trackingmore_api_key TEXT;
```

### Couriers Table — Ensure Courier Rows Exist

Each active courier for a user should have a row in the `couriers` table:

```sql
-- Confirm table structure supports these couriers
-- The 'name' column uses lowercase slug: 'tcs', 'leopards', 'dhl', 'mp', 'pakistan-post'
SELECT * FROM couriers LIMIT 1;
```

---

## Environment Variables

Add to `.env.local`. These are for server-side use only (no `NEXT_PUBLIC_` prefix):

```env
# TCS Courier
# (No global keys needed — credentials are stored per-user in Supabase)

# DHL Express — shared app-level credentials (optional, if using single DHL account)
DHL_API_KEY=your_dhl_api_key
DHL_API_SECRET=your_dhl_api_secret
DHL_ACCOUNT_NUMBER=your_9_digit_account_number

# TrackingMore (for Pakistan Post tracking)
TRACKINGMORE_API_KEY=your_trackingmore_api_key
```

---

## 1. TCS Courier

**Developer Portal:** https://developer.tcscourier.com/products
**API Manual (PDF):** https://envio.tcscourier.com/COD-API-UserManual.pdf
**Contact for Access:** Register at https://sandbox.tcscourier.com/ then request production access

### API Base URLs

| Environment | Base URL |
|---|---|
| Sandbox / Dev | `https://devconnect.tcscourier.com` |
| Production | `https://ociconnect.tcscourier.com` |

### Authentication

TCS uses a two-step Bearer Token flow:

```http
POST /auth/api/auth
Content-Type: application/json

{
  "username": "your_api_key",
  "password": "your_api_password"
}
```

Response:
```json
{
  "token": "eyJhbGci...",
  "expires_in": 3600
}
```

All subsequent requests use:
```http
Authorization: Bearer <token>
```

> **Important:** Tokens expire. Implement token caching with expiry tracking in the service file. Re-authenticate automatically when a 401 is received.

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/auth/api/auth` | POST | Get Bearer token |
| `/ecom/api/authentication` | POST | e-Commerce authentication |
| `/ecom/api/booking/create` | POST | Create/book a shipment |
| `/ecom/api/Payment/status` | GET | Track CN status + payment status |
| `/ecom/api/booking/paymentinvoice` | GET | Payment invoice retrieval |

### Create Shipment — Request Body

```javascript
// POST /ecom/api/booking/create
{
  CostCentreCode: "your_cost_centre_code",   // Required — from Setup > Cost Centre Details in portal
  ConsigneeName: "Customer Full Name",
  ConsigneeAddress: "House #1, Street 2, Area",
  ConsigneeCity: "Karachi",
  ConsigneeMobile: "03001234567",            // 03xxxxxxxxx format
  ConsigneeEmail: "customer@email.com",      // Optional
  ServiceTypeCode: "OVERNIGHT",              // Service level
  PiecesCount: 1,
  Weight: 0.5,                               // In KG
  CODAmount: 2500,                           // PKR, 0 if not COD
  OrderID: "ORD-001",                        // Your internal order reference
  Remarks: "Handle with care"                // Optional notes for rider
}
```

### Track Shipment

```http
GET /ecom/api/Payment/status?customerno=COST_CENTRE_CODE&consignmentno=CN_NUMBER
Authorization: Bearer <token>
```

Response includes: booking date, CN status, payment status, amount paid, delivery date.

### Status Mapping

```javascript
function mapTCSStatus(status) {
  const s = status?.toLowerCase() || '';
  if (s.includes('delivered'))                          return 'completed';
  if (s.includes('returned') || s.includes('cancel'))  return 'cancelled';
  if (s.includes('hold'))                               return 'on-hold';
  if (s.includes('transit') || s.includes('picked'))   return 'processing';
  return 'pending';
}
```

### Service File: `lib/services/tcsService.js`

```javascript
const TCS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://ociconnect.tcscourier.com'
  : 'https://devconnect.tcscourier.com';

// Token cache (in-memory per serverless function lifecycle)
let tokenCache = { token: null, expiresAt: 0 };

async function getTCSToken(apiKey, apiPassword) {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const res = await fetch(`${TCS_BASE_URL}/auth/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: apiKey, password: apiPassword }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('TCS auth failed');
  tokenCache = { token: data.token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.token;
}

export function isTCSConfigured(apiKey, apiPassword) {
  return Boolean(apiKey && apiPassword);
}

export async function createTCSOrder(credentials, orderData) {
  const { apiKey, apiPassword, costCentreCode } = credentials;
  if (!isTCSConfigured(apiKey, apiPassword)) {
    return { configured: false };
  }
  const token = await getTCSToken(apiKey, apiPassword);
  const res = await fetch(`${TCS_BASE_URL}/ecom/api/booking/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      CostCentreCode: costCentreCode,
      ConsigneeName: orderData.customerName,
      ConsigneeAddress: orderData.deliveryAddress,
      ConsigneeCity: orderData.cityName,
      ConsigneeMobile: orderData.customerPhone,
      CODAmount: orderData.invoicePayment,
      OrderID: orderData.orderRefNumber,
      PiecesCount: orderData.items ?? 1,
      Weight: orderData.weight ?? 0.5,
    }),
  });
  const data = await res.json();
  return {
    configured: true,
    success: res.ok,
    trackingNumber: data.ConsignmentNo,
    orderRefNumber: orderData.orderRefNumber,
    raw: data,
  };
}

export async function getTCSStats(credentials) {
  // Fetch recent orders and calculate KPIs
  // Returns same shape as getPostExStats()
}
```

### Webhook Support

TCS supports webhooks for return/NDR events. Configure the webhook URL in the TCS portal:

```
https://yourdomain.com/api/tcs/webhook
```

---

## 2. Leopards Courier

**Merchant API:** https://merchantapi.leopardscourier.com/
**OpenAPI Spec:** Available from Versori (community-published)
**Contact for Access:** Contact Leopards Courier Services directly to receive `api_key` and `api_password`

### API Base URL

```
https://merchantapi.leopardscourier.com
```

### Authentication

Credentials are passed **in the request body** — no HTTP auth headers needed:

```javascript
{
  api_key: "your_api_key",
  api_password: "your_api_password",
  enable_test_mode: "0"   // "1" to use test/sandbox mode, "0" for production
}
```

> No separate sandbox URL. Pass `enable_test_mode: "1"` to switch to test environment.

### Endpoints

All endpoints are `POST` with JSON body:

| Path | Purpose |
|---|---|
| `POST /webservice/getAllCities/format/json/` | Get list of all cities |
| `POST /webservice/bookPacket/format/json/` | Create/book a shipment |
| `POST /webservice/trackBookedPacket/format/json/` | Track a shipment |
| `POST /webservice/cancelBookedPackets/format/json` | Cancel a shipment |

### Create Shipment — Request Body

```javascript
// POST /webservice/bookPacket/format/json/
{
  api_key: "your_api_key",
  api_password: "your_api_password",
  enable_test_mode: "0",

  // Shipment details
  booked_packet_weight: "0.5",                // Weight in KG (string)
  booked_packet_vol_weight_w: "10",           // Volumetric width in cm
  booked_packet_vol_weight_h: "10",           // Volumetric height in cm
  booked_packet_vol_weight_l: "10",           // Volumetric length in cm
  booked_packet_no_piece: "1",                // Number of pieces
  booked_packet_collect_amount: "2500",       // COD amount in PKR (string)
  booked_packet_order_id: "ORD-001",          // Your internal order ID

  // Route
  origin_city: "self",                        // Use "self" for your registered city, or city ID integer
  destination_city: "199",                    // City ID — use getAllCities to get IDs

  // Recipient
  shipment_name_eng: "Customer Name",
  shipment_email: "customer@email.com",
  shipment_phone: "03001234567",              // 03xxxxxxxxx
  shipment_address: "House #1, Street 2, Lahore",
  shipment_type: "overnight",                 // Service type

  // Optional
  special_instructions: "Fragile — handle with care",
  shipment_content: "Clothing"
}
```

### Response

```javascript
{
  status: 1,                        // 1 = success, 0 = failure
  packet_cn: "LEO1234567890",       // Tracking number
  error: null                       // Error message if status = 0
}
```

### Track Shipment

```javascript
// POST /webservice/trackBookedPacket/format/json/
{
  api_key: "your_api_key",
  api_password: "your_api_password",
  enable_test_mode: "0",
  track_numbers: "LEO1234567890"    // Comma-separated for multiple
}
```

### Get All Cities

Run this once and cache — the city list doesn't change often:

```javascript
// POST /webservice/getAllCities/format/json/
{
  api_key: "your_api_key",
  api_password: "your_api_password",
  enable_test_mode: "0"
}
```

Response: Array of `{ id, name, is_origin, is_destination }`.

### Status Mapping

```javascript
function mapLeopardsStatus(activityType) {
  const s = activityType?.toLowerCase() || '';
  if (s.includes('delivered'))              return 'completed';
  if (s.includes('returned') || s.includes('rto')) return 'cancelled';
  if (s.includes('hold'))                   return 'on-hold';
  if (s.includes('in transit') || s.includes('picked') || s.includes('out for delivery')) return 'processing';
  return 'pending';
}
```

### Service File: `lib/services/leopardsService.js`

```javascript
const LEOPARDS_BASE = 'https://merchantapi.leopardscourier.com';

function baseBody(apiKey, apiPassword, testMode = false) {
  return {
    api_key: apiKey,
    api_password: apiPassword,
    enable_test_mode: testMode ? '1' : '0',
  };
}

async function leopardsRequest(path, apiKey, apiPassword, extra = {}) {
  const res = await fetch(`${LEOPARDS_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...baseBody(apiKey, apiPassword), ...extra }),
  });
  return res.json();
}

export function isLeopardsConfigured(apiKey, apiPassword) {
  return Boolean(apiKey && apiPassword);
}

export async function createLeopardsOrder(credentials, orderData) {
  const { apiKey, apiPassword } = credentials;
  if (!isLeopardsConfigured(apiKey, apiPassword)) return { configured: false };

  const data = await leopardsRequest(
    '/webservice/bookPacket/format/json/',
    apiKey,
    apiPassword,
    {
      booked_packet_weight: String(orderData.weight ?? 0.5),
      booked_packet_no_piece: String(orderData.items ?? 1),
      booked_packet_collect_amount: String(orderData.invoicePayment),
      booked_packet_order_id: orderData.orderRefNumber,
      origin_city: 'self',
      destination_city: orderData.destinationCityId,
      shipment_name_eng: orderData.customerName,
      shipment_phone: orderData.customerPhone,
      shipment_address: orderData.deliveryAddress,
      shipment_type: 'overnight',
    }
  );

  return {
    configured: true,
    success: data.status === 1,
    trackingNumber: data.packet_cn,
    orderRefNumber: orderData.orderRefNumber,
    error: data.error,
    raw: data,
  };
}

export async function trackLeopardsPacket(apiKey, apiPassword, trackingNumber) {
  return leopardsRequest('/webservice/trackBookedPacket/format/json/', apiKey, apiPassword, {
    track_numbers: trackingNumber,
  });
}

export async function getLeopardsCities(apiKey, apiPassword) {
  return leopardsRequest('/webservice/getAllCities/format/json/', apiKey, apiPassword);
}
```

---

## 3. Pakistan Post

**Official Site:** https://pakpost.gov.pk/
**Tracking Portal:** https://ep.gov.pk/

### Status: No Direct Booking API

Pakistan Post does not offer a public developer API for shipment booking. The official tracking portal is consumer-facing only (web form at ep.gov.pk). There is no self-serve API registration.

### Recommended Approach: TrackingMore API

Use **TrackingMore** as a third-party aggregator to track Pakistan Post shipments. It supports Pakistan Post as a carrier and provides a unified API.

**TrackingMore Docs:** https://www.trackingmore.com/api-index.html

#### Add Tracking — Request

```http
POST https://api.trackingmore.com/v4/trackings/create
Content-Type: application/json
Tracking-Api-Key: YOUR_TRACKINGMORE_API_KEY

{
  "tracking_number": "EP123456789PK",
  "courier_code": "pakistan-post",
  "title": "Customer Order ORD-001",
  "customer_name": "Ahmed Khan",
  "customer_email": "ahmed@email.com",
  "language": "en"
}
```

#### Get Tracking Info

```http
GET https://api.trackingmore.com/v4/trackings/{courier_code}/{tracking_number}
Tracking-Api-Key: YOUR_TRACKINGMORE_API_KEY
```

Response includes `tag` field for status: `Pending`, `InTransit`, `Delivered`, `Exception`, `Expired`.

#### TrackingMore Status Mapping

```javascript
function mapPakistanPostStatus(tag) {
  switch (tag) {
    case 'Delivered':   return 'completed';
    case 'InTransit':   return 'processing';
    case 'Exception':
    case 'Expired':     return 'cancelled';
    default:            return 'pending';
  }
}
```

#### Service File: `lib/services/pakistanPostService.js`

```javascript
const TRACKINGMORE_BASE = 'https://api.trackingmore.com/v4';

function trackingmoreHeaders() {
  return {
    'Content-Type': 'application/json',
    'Tracking-Api-Key': process.env.TRACKINGMORE_API_KEY,
  };
}

export function isPakistanPostConfigured() {
  return Boolean(process.env.TRACKINGMORE_API_KEY);
}

export async function addPakistanPostTracking(trackingNumber, orderRef) {
  const res = await fetch(`${TRACKINGMORE_BASE}/trackings/create`, {
    method: 'POST',
    headers: trackingmoreHeaders(),
    body: JSON.stringify({
      tracking_number: trackingNumber,
      courier_code: 'pakistan-post',
      title: orderRef,
    }),
  });
  return res.json();
}

export async function getPakistanPostTracking(trackingNumber) {
  const res = await fetch(
    `${TRACKINGMORE_BASE}/trackings/pakistan-post/${trackingNumber}`,
    { headers: trackingmoreHeaders() }
  );
  return res.json();
}
```

#### API Route: `app/api/pakistan-post/track/route.js`

```javascript
import { NextResponse } from 'next/server';
import { getPakistanPostTracking, addPakistanPostTracking } from '@/lib/services/pakistanPostService';

export async function POST(request) {
  const { trackingNumber, orderRef } = await request.json();
  try {
    const result = await addPakistanPostTracking(trackingNumber, orderRef);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get('tracking');
  try {
    const result = await getPakistanPostTracking(trackingNumber);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

> **Booking:** For actual Pakistan Post shipments, bulk booking agreements must be arranged directly with Pakistan Post via customercare@pakpost.gov.pk or calling 111-111-117.

---

## 4. DHL Express

**Developer Portal:** https://developer.dhl.com/
**API Reference:** https://developer.dhl.com/api-reference/mydhl-api-dhl-express
**Sandbox:** https://express.api.dhl.com/mydhlapi/test

### API Base URLs

| Environment | URL |
|---|---|
| Production (MyDHL API) | `https://express.api.dhl.com/mydhlapi` |
| Sandbox (MyDHL API) | `https://express.api.dhl.com/mydhlapi/test` |
| Tracking (all DHL types) | `https://api-eu.dhl.com` |

### Authentication

DHL uses **two separate auth methods** depending on the operation:

#### MyDHL API (Booking, Rates, Pickup) — HTTP Basic Auth

```javascript
const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
// Header:
Authorization: Basic <base64_credentials>
```

#### Shipment Tracking API — API Key Header

```http
DHL-API-Key: your_consumer_key
```

### Endpoints

| Operation | Method | Path | Auth |
|---|---|---|---|
| Rate quote | GET | `/rates` | Basic Auth |
| Create shipment + label | POST | `/shipments` | Basic Auth |
| Request pickup | POST | `/pickups` | Basic Auth |
| Cancel pickup | DELETE | `/pickups/{id}` | Basic Auth |
| Track (Express) | GET | `/tracking/shipments?shipmentTrackingNumber=` | Basic Auth |
| Validate address | GET | `/address-validate` | Basic Auth |
| Track (Unified) | GET `https://api-eu.dhl.com/track/shipments?trackingNumber=` | API Key header |

### Rate Quote

```http
GET /rates?accountNumber=123456789&originCountryCode=PK&originCityName=Karachi&destinationCountryCode=GB&destinationCityName=London&weight=1.5&length=20&width=15&height=10&plannedShippingDateAndTime=2026-07-01T12:00:00&isCustomsDeclarable=false
Authorization: Basic <credentials>
Content-Type: application/json
```

### Create Shipment — Request Body

```javascript
// POST /shipments
{
  plannedShippingDateAndTime: "2026-07-01T14:00:00 GMT+05:00",
  pickup: { isRequested: false },
  productCode: "P",                // Express Worldwide product code
  localProductCode: "P",
  getRateEstimates: false,
  accounts: [
    { typeCode: "shipper", number: "123456789" }  // Your DHL account number
  ],
  outputImageProperties: {
    printerDPI: 300,
    encodingFormat: "pdf",
    imageOptions: [{ typeCode: "label", templateName: "ECOM26_84_A4_001" }]
  },
  customerDetails: {
    shipperDetails: {
      postalAddress: {
        postalCode: "75500",
        cityName: "Karachi",
        countryCode: "PK",
        addressLine1: "Your business address"
      },
      contactInformation: {
        fullName: "Your Business Name",
        phone: "+92300000000",
        email: "your@email.com"
      }
    },
    receiverDetails: {
      postalAddress: {
        cityName: "London",
        countryCode: "GB",
        postalCode: "SW1A 1AA",
        addressLine1: "Recipient address"
      },
      contactInformation: {
        fullName: "Recipient Name",
        phone: "+441234567890",
        email: "recipient@email.com"
      }
    }
  },
  content: {
    packages: [
      {
        weight: 1.5,
        dimensions: { length: 20, width: 15, height: 10 }
      }
    ],
    isCustomsDeclarable: false,
    declaredValue: 100,
    declaredValueCurrency: "USD",
    exportDeclaration: null,       // Required for international declarable shipments
    description: "Clothing"
  }
}
```

### Response — Label Extraction

```javascript
const shipmentResponse = await res.json();
const trackingNumber = shipmentResponse.shipmentTrackingNumber;
const labelBase64 = shipmentResponse.documents?.[0]?.content;  // Base64 PDF label
```

### Track Shipment (Unified API)

```http
GET https://api-eu.dhl.com/track/shipments?trackingNumber=1234567890
DHL-API-Key: your_consumer_key
```

### Status Mapping

```javascript
function mapDHLStatus(statusCode) {
  switch (statusCode) {
    case 'delivered':      return 'completed';
    case 'transit':
    case 'pickup':         return 'processing';
    case 'exception':
    case 'returned':       return 'cancelled';
    case 'hold':           return 'on-hold';
    default:               return 'pending';
  }
}
```

### Service File: `lib/services/dhlService.js`

```javascript
const DHL_BASE = process.env.NODE_ENV === 'production'
  ? 'https://express.api.dhl.com/mydhlapi'
  : 'https://express.api.dhl.com/mydhlapi/test';

const DHL_TRACK_BASE = 'https://api-eu.dhl.com';

function dhlBasicAuth(apiKey, apiSecret) {
  return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

async function dhlRequest(path, apiKey, apiSecret, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: dhlBasicAuth(apiKey, apiSecret),
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${DHL_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `DHL API error ${res.status}`);
  }
  return res.json();
}

export function isDHLConfigured(apiKey, apiSecret, accountNumber) {
  return Boolean(apiKey && apiSecret && accountNumber);
}

export async function getDHLRates(credentials, shipmentDetails) {
  const { apiKey, apiSecret, accountNumber } = credentials;
  if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false };
  const { origin, destination, weight, dimensions, date } = shipmentDetails;
  const params = new URLSearchParams({
    accountNumber,
    originCountryCode: origin.countryCode,
    originCityName: origin.cityName,
    destinationCountryCode: destination.countryCode,
    destinationCityName: destination.cityName,
    weight,
    length: dimensions.length,
    width: dimensions.width,
    height: dimensions.height,
    plannedShippingDateAndTime: date,
    isCustomsDeclarable: 'false',
  });
  const data = await dhlRequest(`/rates?${params}`, apiKey, apiSecret);
  return { configured: true, products: data.products };
}

export async function createDHLShipment(credentials, orderData) {
  const { apiKey, apiSecret, accountNumber } = credentials;
  if (!isDHLConfigured(apiKey, apiSecret, accountNumber)) return { configured: false };

  const body = buildDHLShipmentPayload(accountNumber, orderData);
  const data = await dhlRequest('/shipments', apiKey, apiSecret, 'POST', body);

  return {
    configured: true,
    success: true,
    trackingNumber: data.shipmentTrackingNumber,
    labelBase64: data.documents?.[0]?.content,
    raw: data,
  };
}

export async function trackDHLShipment(trackingNumber, consumerKey) {
  const res = await fetch(
    `${DHL_TRACK_BASE}/track/shipments?trackingNumber=${trackingNumber}`,
    { headers: { 'DHL-API-Key': consumerKey } }
  );
  return res.json();
}

function buildDHLShipmentPayload(accountNumber, orderData) {
  return {
    plannedShippingDateAndTime: new Date().toISOString().replace('Z', ' GMT+05:00'),
    pickup: { isRequested: false },
    productCode: 'P',
    localProductCode: 'P',
    accounts: [{ typeCode: 'shipper', number: accountNumber }],
    outputImageProperties: {
      printerDPI: 300,
      encodingFormat: 'pdf',
      imageOptions: [{ typeCode: 'label', templateName: 'ECOM26_84_A4_001' }],
    },
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: orderData.shipperPostalCode ?? '75500',
          cityName: orderData.shipperCity ?? 'Karachi',
          countryCode: 'PK',
          addressLine1: orderData.shipperAddress,
        },
        contactInformation: {
          fullName: orderData.shipperName,
          phone: orderData.shipperPhone,
          email: orderData.shipperEmail,
        },
      },
      receiverDetails: {
        postalAddress: {
          cityName: orderData.cityName,
          countryCode: orderData.destinationCountryCode ?? 'PK',
          addressLine1: orderData.deliveryAddress,
        },
        contactInformation: {
          fullName: orderData.customerName,
          phone: orderData.customerPhone,
          email: orderData.customerEmail ?? '',
        },
      },
    },
    content: {
      packages: [{ weight: orderData.weight ?? 0.5, dimensions: orderData.dimensions ?? { length: 15, width: 10, height: 10 } }],
      isCustomsDeclarable: false,
      declaredValue: orderData.invoicePayment,
      declaredValueCurrency: 'PKR',
      description: orderData.orderDetail ?? 'Goods',
    },
  };
}
```

---

## 5. M&P Express Logistics

**Official Site:** https://www.mulphilog.com/
**COD Portal:** https://mnptracking.com.pk/mnp-cod-portal-login/
**API Access Email:** api@mulphilog.com
**Phone:** 021-111-202-202

### Status: API Access by Request Only

M&P does not publish public API documentation. API credentials and integration docs are provided directly to enterprise partners. Third-party Shopify/WooCommerce integrators (ShipKardo, etc.) confirm an internal API exists supporting:

- Bulk shipment booking
- Label and invoice generation
- Real-time status sync
- COD portal integration
- 750+ city coverage, 2M+ shipments/month

### How to Get Access

1. Email **api@mulphilog.com** with your business name, website, monthly volume estimate, and intended integration (WooCommerce, Shopify, custom API)
2. Or call **021-111-202-202** (business hours, Mon–Sat)
3. M&P will provide credentials, API documentation, and a test environment

### Expected Service File Structure

Once M&P provides their API docs, create `lib/services/mpService.js` following this expected pattern (update with actual endpoints once received):

```javascript
// Placeholder — update with actual M&P API details after onboarding
const MP_BASE_URL = 'https://api.mulphilog.com';  // Update when confirmed

export function isMPConfigured(apiKey, apiPassword) {
  return Boolean(apiKey && apiPassword);
}

export async function createMPOrder(credentials, orderData) {
  const { apiKey, apiPassword } = credentials;
  if (!isMPConfigured(apiKey, apiPassword)) return { configured: false };

  // TODO: Replace with actual M&P endpoint and payload format once docs received
  const res = await fetch(`${MP_BASE_URL}/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'X-Api-Password': apiPassword,
    },
    body: JSON.stringify({
      orderRef: orderData.orderRefNumber,
      recipientName: orderData.customerName,
      recipientPhone: orderData.customerPhone,
      recipientAddress: orderData.deliveryAddress,
      city: orderData.cityName,
      codAmount: orderData.invoicePayment,
      pieces: orderData.items ?? 1,
    }),
  });
  const data = await res.json();
  return { configured: true, success: res.ok, trackingNumber: data.cn, raw: data };
}
```

---

## Service File Template

Copy this template for any new courier integration:

```javascript
// lib/services/[courier]Service.js

const BASE_URL = 'https://api.[courier].com';

async function courierRequest(endpoint, credentials, body = null, method = 'POST') {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Add auth header appropriate for this courier
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`[Courier] API error: ${res.status}`);
  return res.json();
}

export function isCourierConfigured(apiKey) {
  return Boolean(apiKey);
}

export async function getCourierStats(credentials) {
  if (!isCourierConfigured(credentials.apiKey)) {
    return { configured: false };
  }
  // Fetch orders, compute KPIs
  return {
    configured: true,
    todayShipments: 0,
    totalShipments: 0,
    codPending: 0,
    codRecovered: 0,
    currency: 'PKR',
    lastUpdated: new Date().toISOString(),
  };
}

export async function getCourierOrders(options = {}) {
  const { apiKey, page = 1, limit = 20, startDate, endDate } = options;
  if (!isCourierConfigured(apiKey)) return { configured: false };
  const raw = await courierRequest('/orders', { apiKey }, { startDate, endDate });
  const orders = raw.orders.map(normalizeCourierOrder);
  return { configured: true, orders, pagination: { page, limit, total: orders.length } };
}

export async function createCourierOrder(credentials, orderData) {
  if (!isCourierConfigured(credentials.apiKey)) return { configured: false };
  const data = await courierRequest('/create', credentials, {
    // Map orderData to courier's expected format
  });
  return {
    configured: true,
    success: true,
    trackingNumber: data.trackingNumber,
    orderRefNumber: orderData.orderRefNumber,
    raw: data,
  };
}

function normalizeCourierOrder(raw) {
  return {
    id: raw.id,
    trackingNumber: raw.cn,
    orderRefNumber: raw.orderRef,
    customerName: raw.recipientName,
    customerPhone: normalizePhone(raw.phone),
    deliveryAddress: raw.address,
    cityName: raw.city,
    invoicePayment: Number(raw.codAmount),
    status: mapCourierStatus(raw.status),
    orderDate: raw.createdAt?.split('T')[0],
    items: Number(raw.pieces) || 1,
    courier: '[courier]',
    raw,
  };
}

function mapCourierStatus(status) {
  const s = status?.toLowerCase() || '';
  if (s.includes('delivered'))              return 'completed';
  if (s.includes('return') || s.includes('cancel')) return 'cancelled';
  if (s.includes('hold'))                   return 'on-hold';
  if (s.includes('transit') || s.includes('picked')) return 'processing';
  return 'pending';
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2);
  if (digits.startsWith('0') && digits.length === 11) return digits;
  return phone;
}
```

---

## API Route Template

```javascript
// app/api/[courier]/create-order/route.js
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { createCourierOrder, isCourierConfigured } from '@/lib/services/[courier]Service';

export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orderData = await request.json();
    const supabase = createSupabaseServerClient();

    // Fetch user credentials from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('[courier]_api_key, [courier]_api_password')
      .eq('id', userId)
      .single();

    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const credentials = {
      apiKey: user['[courier]_api_key'],
      apiPassword: user['[courier]_api_password'],
    };

    if (!isCourierConfigured(credentials.apiKey)) {
      return NextResponse.json({ configured: false, error: '[Courier] not configured' }, { status: 200 });
    }

    const result = await createCourierOrder(credentials, orderData);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[Courier] create-order error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## UI Integration

### 1. Add Courier to the Logo Map

In `components/dashboard/pages/CouriersPage.jsx`, update the `getLogo()` function:

```javascript
function getLogo(courierName) {
  const name = courierName?.toLowerCase() || '';
  if (name.includes('tcs'))          return 'https://seeklogo.com/images/T/tcs-courier-logo-...';
  if (name.includes('leopard'))      return 'https://seeklogo.com/images/L/leopards-courier-logo-...';
  if (name.includes('postex'))       return '...';
  if (name.includes('trax'))         return '...';
  if (name.includes('dhl'))          return 'https://seeklogo.com/images/D/dhl-logo-...';
  if (name.includes('mp') || name.includes('muller')) return '...';
  if (name.includes('pakistan post')) return '...';
  return '';
}
```

### 2. Add Credential Fields to Settings Page

In `components/dashboard/pages/SettingsPage.jsx` (or `app/settings/`), add input fields for each new courier. Follow the PostEx API key input pattern exactly.

### 3. Update couriersService.js

In `lib/services/couriersService.js`, add the new couriers to any hard-coded courier name/status lists.

---

## Getting API Credentials

### TCS

1. Create an account at https://sandbox.tcscourier.com/
2. Log in to the TCS COD portal at www.tcscourier.com/cod/
3. Navigate to **Setup → Cost Centre Details** — note your Cost Centre Code
4. Your portal login (email + password) serves as the API Key and API Password
5. Complete UAT testing on the dev environment before production access is approved
6. For questions: https://developer.tcscourier.com/ or contact your TCS account manager

### Leopards

1. Contact Leopards Courier Services directly — there is no self-serve signup
2. Email or call your LCS account representative and request API access
3. You will receive an `api_key` and `api_password` pair
4. Use `enable_test_mode: "1"` in your requests to test without creating real shipments

### Pakistan Post (TrackingMore)

1. Register at https://www.trackingmore.com/
2. Go to **Dashboard → API** to get your API key
3. Free tier: 100 tracking API calls/month; paid plans available
4. Add `TRACKINGMORE_API_KEY` to your `.env.local`

### DHL Express

1. Register at https://developer.dhl.com/user
2. You must have an **active 9-digit DHL Express account number** (contact DHL sales if needed)
3. Submit a credential request — select: Rating, Shipment, Tracking
4. Receive `API Key` (for tracking) and `API Secret` (for MyDHL Basic Auth) via email
5. Sandbox allows 500 daily API calls; test at `https://express.api.dhl.com/mydhlapi/test`
6. Contact: developer.support@dhl.com

### M&P (Muller & Phipps)

1. Email **api@mulphilog.com** with your business name, volume, and integration type
2. Or call **021-111-202-202** (Mon–Sat, business hours)
3. Provide: business registration, monthly shipment volume, intended platform (WooCommerce/Shopify/custom)
4. M&P will provide API credentials, documentation, and a test environment
5. COD portal access: https://mnptracking.com.pk/mnp-cod-portal-login/

---

## Notes on Phone Number Normalization

All Pakistani courier APIs expect phone numbers in `03xxxxxxxxx` format (11 digits, starting with 0). Apply this normalization helper in every service:

```javascript
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Convert +923xxxxxxxxx or 923xxxxxxxxx → 03xxxxxxxxx
  if (digits.startsWith('92') && digits.length === 12) return '0' + digits.slice(2);
  // Already in correct format
  if (digits.startsWith('0') && digits.length === 11) return digits;
  return phone; // Return as-is if unrecognized format
}
```

---

*Last updated: June 2026 | Based on PostEx integration pattern in `lib/services/postexService.js`*
