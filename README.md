# Casa Nest – home living & furniture store

React 18 + Vite + Tailwind CSS on the front end, Supabase (Postgres, Auth, Row Level Security) as the backend.

## Features

**Customers**
- Sign up, sign in, sign out, forgot / reset password, change password
- Browse, search, filter by category, sort; product pages with gallery, specs, stock and reviews
- Cart that works for guests (saved in the browser) and merges into the database cart on sign-in
- Checkout with saved or new addresses (cash on delivery), atomic order placement, order history, order tracking, self-service cancellation
- Profile (name, phone), address book with default address, favourites

**Staff / admin** (`/admin`)
- Dashboard: revenue, order counts, low-stock list
- Products: create, edit, delete, hide, feature, stock and pricing
- Categories: create, edit, delete
- Orders: update order and payment status
- Users & roles (admin only): promote or demote customer / staff / admin

## Setup

1. **Create a Supabase project** at https://supabase.com.
2. **Create the tables**: Dashboard → SQL Editor → New query → paste `supabase/schema.sql` → Run.
   Run it once on a fresh project. It creates all tables, triggers, security policies, order functions and a sample catalogue.
3. **Add your keys**: copy `.env.example` to `.env` and fill in the project URL and anon key
   (Project Settings → API).
4. **Install and run**
   ```bash
   npm install
   npm run dev
   ```
5. **Auth settings** (Dashboard → Authentication):
   - URL Configuration: set *Site URL* to your app URL (`http://localhost:5173` while developing) and add `<your-url>/reset-password` to *Redirect URLs*.
   - Providers → Email: for quick testing you can turn off "Confirm email"; leave it on in production.
6. **Make yourself the first admin**: sign up in the app, then run in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Refresh the app and an *Admin panel* link appears in the account menu. From then on you can promote others from **Admin → Users & roles**.

## Database overview

| Table | Purpose |
|---|---|
| `profiles` | One row per user: name, phone, email, **role** (`customer` / `staff` / `admin`). Created automatically on sign-up. |
| `addresses` | Saved shipping addresses, one default per user. |
| `categories` | Product categories. |
| `products` | Catalogue: price, compare-at price, stock, images, specs, featured / active flags. |
| `carts`, `cart_items` | One cart per user and its line items. |
| `wishlist_items` | Favourites. |
| `reviews` | Ratings and comments, one per user per product. |
| `orders`, `order_items` | Orders with price and address snapshots, so history stays correct if products change later. |

How it is protected:
- **Row Level Security** is on for every table. Customers can only touch their own rows; staff and admins get extra access through the `is_staff()` / `is_admin()` helpers.
- **Roles can't be self-assigned.** A trigger blocks role changes unless the caller is an admin.
- **Orders go through `place_order()`**, a database function that checks stock, locks the rows, snapshots prices, decrements stock and empties the cart in one transaction. Customers can't insert orders or set prices directly.
- **Cancellations** go through `cancel_order()`; stock is returned automatically when an order becomes cancelled.

## Good to know

- **Payments:** only cash on delivery is wired up. Online payment appears as "coming soon" at checkout. To add it, create the order, then confirm payment from a Supabase Edge Function using your gateway's webhook (Razorpay, Stripe, etc.) and set `payment_status` there.
- **Shipping rule:** free at ₹5,000+, otherwise ₹199. It lives in two places that must match: `place_order()` in the SQL and `src/lib/format.js`.
- **Sample images** in the seed data are Unsplash links. Replace them from Admin → Products (image URLs), or upload to a Supabase Storage bucket and paste the public URL.
- **Deploying:** `npm run build` outputs `dist/`. On Netlify or Vercel set the two `VITE_` env vars and add an SPA rewrite so every route serves `index.html`.

## Project layout

```
supabase/schema.sql      tables, RLS, triggers, RPC functions, seed data
src/context/             Auth, Cart, Wishlist providers
src/components/          Navbar, ProductCard, ProtectedRoute, ...
src/pages/               storefront, account and checkout pages
src/pages/admin/         admin panel
```
