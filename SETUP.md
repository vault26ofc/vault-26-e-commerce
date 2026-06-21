# Vault 26 — Integration Setup Guide

## Table of Contents
- [Razorpay](#razorpay)
- [WhatsApp Automation](#whatsapp-automation)
- [Google OAuth](#google-oauth)
- [Google Analytics & Tag Manager](#google-analytics--tag-manager)
- [Supabase Configuration](#supabase-configuration)

---

## Razorpay

### Step 1 — Get API Keys
1. Go to `dashboard.razorpay.com` → **Settings → API Keys**
2. Generate a **Live** key pair (use Test keys first)
3. Copy both values:
   - **Key ID** → `rzp_live_...`
   - **Key Secret** → shown only once, copy immediately

### Step 2 — Add Secrets to Supabase
Go to: Supabase Dashboard → **Edge Functions → Secrets**

```
RAZORPAY_KEY_ID      = rzp_live_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET  = xxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3 — Deploy Edge Functions
```bash
npx supabase login
npx supabase link --project-ref yevidhicrhyidrklflvn
npx supabase functions deploy razorpay-create-order
npx supabase functions deploy razorpay-verify-payment
```

### Step 4 — Test
Use test keys first. Place an order and use:
- **Card:** `4111 1111 1111 1111`
- **Expiry:** any future date
- **CVV:** any 3 digits

### How it works
| Step | What happens |
|------|-------------|
| User clicks "Finalize Order" | `create_order` RPC runs server-side (re-validates prices from DB) |
| Order created | Edge function `razorpay-create-order` creates a Razorpay order |
| Modal opens | User completes payment |
| Payment done | Edge function `razorpay-verify-payment` verifies HMAC signature |
| Verified | Order marked `PAID` in DB, WhatsApp notification sent |

> **Note:** COD orders above ₹2000 require a 20% advance payment via Razorpay. Configurable in the `settings` table.

---

## WhatsApp Automation

The codebase uses Meta (Facebook) WhatsApp Business API. All logic is in `src/lib/whatsapp/`.

### Triggers built in
| Trigger | When |
|---------|------|
| `order_placed` | Every new order |
| `order_confirmed` | Admin confirms order |
| `order_shipped` | Admin marks shipped |
| `order_delivered` | Admin marks delivered |
| `order_cancelled` | Order cancelled |
| `payment_success` | Razorpay payment verified |
| `payment_failed` | Payment failed |
| `cod_verification` | COD order placed |
| `refund_initiated` | Refund started |
| `refund_completed` | Refund done |
| `abandoned_cart_1h` | Cart inactive 1 hour |
| `abandoned_cart_24h` | Cart inactive 24 hours |
| `abandoned_cart_48h` | Cart inactive 48 hours |
| `back_in_stock` | Product restocked |
| `new_arrivals` | New products added |
| `marketing_campaign` | Manual bulk campaign from admin |

### Step 1 — Create Meta Developer App
1. Go to `developers.facebook.com` → **My Apps → Create App**
2. Choose **Business** type → name it `Vault 26`
3. Add **WhatsApp** product to the app
4. Go to **WhatsApp → Getting Started**
5. Copy the **Temporary access token** and **Phone Number ID**

For production, create a **System User** in Meta Business Suite and generate a permanent token.

### Step 2 — Create Message Templates
Go to `business.facebook.com` → **WhatsApp Manager → Message Templates**

Create and submit these for approval:

| Template name | Category | Sample message |
|--------------|----------|----------------|
| `order_placed` | Utility | Hi {{1}}, your order {{2}} for ₹{{3}} is confirmed! We'll ship it soon. |
| `order_shipped` | Utility | Your order {{2}} has been shipped! Track it here: {{4}} |
| `order_delivered` | Utility | Order {{2}} has been delivered. Hope you love it! |
| `abandoned_cart_1h` | Marketing | Hi {{1}}, you left something in your bag. Complete your order: {{2}} |
| `abandoned_cart_24h` | Marketing | Still thinking? Your cart at Vault 26 is waiting. Shop now: {{2}} |

> Templates take 24–48 hours for Meta approval. Submit them early.

### Step 3 — Register Webhook in Meta
1. Meta Developers → **WhatsApp → Configuration → Webhook**
2. Set **Callback URL** to:
   ```
   https://yevidhicrhyidrklflvn.supabase.co/functions/v1/whatsapp-webhook
   ```
3. Set **Verify Token** to any secret string (e.g. `vault26_wh_secret_2026`)
4. Subscribe to: **messages**

### Step 4 — Add Secrets to Supabase
Go to: Supabase Dashboard → **Edge Functions → Secrets**

```
WHATSAPP_ENABLED          = true
WHATSAPP_PROVIDER         = meta
WHATSAPP_ACCESS_TOKEN     = EAAxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID  = 12345678901234
WHATSAPP_VERIFY_TOKEN     = vault26_wh_secret_2026
STORE_URL                 = https://vault26.co.in
```

> `WHATSAPP_ACCESS_TOKEN` = your Meta System User permanent token  
> `WHATSAPP_PHONE_NUMBER_ID` = from Meta WhatsApp → Getting Started  
> `WHATSAPP_VERIFY_TOKEN` = the same string you used in Step 3

### Step 5 — Deploy Edge Functions
```bash
npx supabase functions deploy whatsapp-send
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy process-queue
npx supabase functions deploy abandoned-cart-scan
```

### Step 6 — Run Database Migrations
```bash
npx supabase db push
```

This creates 6 tables: `whatsapp_logs`, `notification_queue`, `notification_templates`, `customer_notification_preferences`, `marketing_campaigns`, `abandoned_carts`.

To verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%whatsapp%';
```

### Step 7 — Set Up Cron Jobs
In Supabase Dashboard → **Database → Extensions**, enable `pg_cron`.

Then run in **SQL Editor**:
```sql
-- Process message queue every 5 minutes
select cron.schedule(
  'process-whatsapp-queue',
  '*/5 * * * *',
  $$select net.http_post(
    url := 'https://yevidhicrhyidrklflvn.supabase.co/functions/v1/process-queue',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);

-- Scan abandoned carts every hour
select cron.schedule(
  'scan-abandoned-carts',
  '0 * * * *',
  $$select net.http_post(
    url := 'https://yevidhicrhyidrklflvn.supabase.co/functions/v1/abandoned-cart-scan',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )$$
);
```

Replace `YOUR_ANON_KEY` with the value from Supabase → **Settings → API → anon public key**.

### Step 8 — Test
1. Place a test order on vault26.co.in
2. Go to **Admin → WhatsApp → Message Logs**
3. You should see an `order_placed` entry
4. If status is `failed`, check the error column — usually template not approved yet or phone not added as test number

### Admin Dashboard
The WhatsApp admin panel at `/admin` → **WhatsApp** lets you:
- View all message logs with delivery status
- Monitor and retry the message queue
- Enable/disable individual templates
- Run bulk marketing campaigns
- View customer opt-in/out preferences

---

## Google OAuth

### Google Cloud Console
1. Go to `console.cloud.google.com` → **APIs & Services → Credentials**
2. Open your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript Origins**:
   ```
   https://vault26.co.in
   https://yevidhicrhyidrklflvn.supabase.co
   ```
4. Add to **Authorized Redirect URIs**:
   ```
   https://yevidhicrhyidrklflvn.supabase.co/auth/v1/callback
   ```
5. Copy the **Client Secret**

### OAuth Consent Screen
Go to **APIs & Services → OAuth Consent Screen**:
- **App name:** `Vault 26`
- **User support email:** `vault26help@gmail.com`
- **App homepage:** `https://vault26.co.in`
- **Authorized domains:** add `vault26.co.in`

### Supabase Dashboard
Go to: Supabase → **Authentication → Providers → Google**
- Toggle **Enable** on
- **Client ID:** `23712037359-u3je0baab5437o7998b80729ng3bm0ec.apps.googleusercontent.com`
- **Client Secret:** paste from Google Cloud Console
- Save

### Supabase URL Configuration
Go to: Supabase → **Authentication → URL Configuration**
- **Site URL:** `https://vault26.co.in`
- **Redirect URLs:** add `https://vault26.co.in/**`

> The Google consent screen will show "Sign in to yevidhicrhyidrkIflvn.supabase.co" on the free Supabase tier — this is expected. Upgrade to Supabase Pro and add a custom auth domain to show your own branding.

---

## Google Analytics & Tag Manager

Already added to `index.html`. No further code changes needed.

| Service | ID |
|---------|-----|
| Google Analytics 4 | `G-18XKNT8J7X` |
| Google Tag Manager | `GTM-MQ3K2458` |

### Remaining setup in GA4 Dashboard
1. Go to `analytics.google.com` → your property
2. **Admin → Data Streams** → verify vault26.co.in is listed
3. **Admin → Events** → mark `purchase` as a conversion event
4. Set up **Goals**: purchase, add_to_cart, sign_up

### Search Console
1. Go to `search.google.com/search-console`
2. Add property → `https://vault26.co.in`
3. Verify via DNS TXT record
4. Submit sitemap: `https://vault26.co.in/sitemap.xml`

### Google Merchant Center (for Shopping listings)
1. Go to `merchants.google.com`
2. Add store → verify vault26.co.in
3. Create a product feed from your Supabase products table
4. Link to Google Ads when ready

---

## Supabase Configuration

### Project details
| Field | Value |
|-------|-------|
| Project ID | `yevidhicrhyidrklflvn` |
| Project URL | `https://yevidhicrhyidrklflvn.supabase.co` |
| Dashboard | `supabase.com/dashboard/project/yevidhicrhyidrklflvn` |

### All Edge Functions to deploy
```bash
npx supabase functions deploy razorpay-create-order
npx supabase functions deploy razorpay-verify-payment
npx supabase functions deploy whatsapp-send
npx supabase functions deploy whatsapp-webhook
npx supabase functions deploy process-queue
npx supabase functions deploy abandoned-cart-scan
```

### All secrets required
| Secret | Used by |
|--------|---------|
| `RAZORPAY_KEY_ID` | razorpay-create-order |
| `RAZORPAY_KEY_SECRET` | razorpay-create-order, razorpay-verify-payment |
| `WHATSAPP_ENABLED` | all whatsapp functions |
| `WHATSAPP_PROVIDER` | all whatsapp functions |
| `WHATSAPP_ACCESS_TOKEN` | whatsapp-send |
| `WHATSAPP_PHONE_NUMBER_ID` | whatsapp-send |
| `WHATSAPP_VERIFY_TOKEN` | whatsapp-webhook |
| `STORE_URL` | abandoned-cart-scan |

### Email confirmation
To disable email verification on signup (so users log in immediately):
Go to Supabase → **Authentication → Providers → Email** → toggle off **Confirm email**

---

## Checklist

### Razorpay
- [ ] API keys generated (live)
- [ ] `RAZORPAY_KEY_ID` added to Supabase secrets
- [ ] `RAZORPAY_KEY_SECRET` added to Supabase secrets
- [ ] `razorpay-create-order` deployed
- [ ] `razorpay-verify-payment` deployed
- [ ] Test order placed successfully

### WhatsApp
- [ ] Meta developer app created
- [ ] Message templates submitted and approved
- [ ] Webhook URL registered in Meta
- [ ] All 5 secrets added to Supabase
- [ ] All 4 edge functions deployed
- [ ] Database migrations applied (`npx supabase db push`)
- [ ] pg_cron extension enabled
- [ ] Cron jobs created for queue + abandoned cart
- [ ] Test order triggers WhatsApp message

### Google OAuth
- [ ] Authorized redirect URI added in Google Cloud Console
- [ ] Client Secret added to Supabase
- [ ] Site URL updated in Supabase to `https://vault26.co.in`
- [ ] Redirect URL `https://vault26.co.in/**` added in Supabase

### Google Services
- [ ] Search Console property verified
- [ ] Sitemap submitted
- [ ] GA4 purchase event marked as conversion
- [ ] Merchant Center store verified (for Shopping)
