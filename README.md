# Vault 26 — Premium Clothing E-commerce

A production-ready e-commerce storefront and admin panel built on the Lovable
stack: React 18 + Vite + TypeScript + Tailwind, with Lovable Cloud (Supabase)
for the database, auth, storage, and Edge Functions. Razorpay handles payments
(full pay or COD with advance), and WhatsApp is wired up for customer enquiries.

## Features

**Storefront**
- Home with featured pieces & per-brand sections
- Category / Brand / Search listings with filters and sort
- Product detail with variant (color/size) selection, image gallery, related products, and rich SEO + Open Graph + JSON-LD
- Persistent cart (drawer + checkout) with coupon application
- 3-step checkout: Address → Payment → Review
- Razorpay (UPI/Cards/Wallets) and Cash on Delivery with configurable advance
- Wishlist, Account profile, Address book, Orders history with tracking status
- Email/password + Google authentication
- WhatsApp floating enquiry button

**Admin**
- Dashboard with sales metrics
- Orders management with status workflow (PENDING → PACKED → SHIPPED → DELIVERED)
- Products CRUD with image upload to Cloud storage and inline variant editor
- Coupons (PERCENT / FLAT, min order, active toggle)
- Customers list
- Settings: free-shipping threshold, shipping fee, COD threshold/advance %, WhatsApp number, announcement banner

## Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind, shadcn/ui, framer-motion, zustand, react-router
- **Backend**: Lovable Cloud (Supabase Postgres, Auth, Storage, Edge Functions)
- **Payments**: Razorpay (server-side verified via HMAC SHA256 in Edge Functions)

## Local development

```bash
bun install
bun run dev
```

The app reads its backend credentials from `.env` (auto-managed by Lovable Cloud — do not edit manually):

```
VITE_SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Razorpay setup

Server-side secrets (already configured in Lovable Cloud):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Edge Functions:

- `razorpay-create-order` — creates a Razorpay order for the given amount
- `razorpay-verify-payment` — verifies the signature server-side and marks the order PAID/CONFIRMED

## Admin access

The first user that signs up gets the `customer` role automatically. To grant
admin access, insert into `user_roles`:

```sql
INSERT INTO public.user_roles (user_id, role) VALUES ('<user-id>', 'admin');
```

Then the user can access `/admin`.

## Production

```bash
bun run build
```

Deploy via Lovable's **Publish** button. Edge Functions are deployed automatically.
