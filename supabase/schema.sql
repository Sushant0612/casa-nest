-- =====================================================================
-- Casa Nest – Supabase schema (home living & furniture store)
-- Run ONCE on a fresh project:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.user_role      as enum ('customer', 'staff', 'admin');
create type public.order_status   as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.payment_method as enum ('cod', 'online');

-- ---------------------------------------------------------------------
-- GENERIC TRIGGER: keep updated_at fresh
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

-- 1. profiles: one row per auth user (role lives here)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. addresses: saved shipping addresses
create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  label        text not null default 'Home',
  full_name    text not null,
  phone        text not null,
  line1        text not null,
  line2        text,
  city         text not null,
  state        text not null,
  postal_code  text not null,
  country      text not null default 'India',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index addresses_user_idx on public.addresses(user_id);
create unique index one_default_address_per_user on public.addresses(user_id) where is_default;

-- 3. categories
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  image_url    text,
  created_at   timestamptz not null default now()
);

-- 4. products
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories(id) on delete set null,
  name              text not null,
  slug              text not null unique,
  description       text,
  price             numeric(10,2) not null check (price >= 0),
  compare_at_price  numeric(10,2) check (compare_at_price >= 0),
  stock             integer not null default 0 check (stock >= 0),
  image_url         text,
  images            text[] not null default '{}',
  material          text,
  dimensions        text,
  color             text,
  is_featured       boolean not null default false,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_active_idx   on public.products(is_active);

-- 5. carts (one per user) + cart_items
create table public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (cart_id, product_id)
);
create index cart_items_cart_idx on public.cart_items(cart_id);

-- 6. wishlist
create table public.wishlist_items (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- 7. reviews
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  author_name  text not null default 'Customer',
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (product_id, user_id)
);
create index reviews_product_idx on public.reviews(product_id);

-- 8. orders + order_items (price & address are snapshotted at purchase time)
create sequence public.order_number_seq start 1001;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  user_id           uuid not null references public.profiles(id) on delete restrict,
  status            public.order_status   not null default 'pending',
  payment_method    public.payment_method not null default 'cod',
  payment_status    public.payment_status not null default 'pending',
  subtotal          numeric(10,2) not null,
  shipping_fee      numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  shipping_address  jsonb not null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_user_idx   on public.orders(user_id);
create index orders_status_idx on public.orders(status);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,
  image_url     text,
  unit_price    numeric(10,2) not null,
  quantity      integer not null check (quantity > 0),
  line_total    numeric(10,2) generated always as (unit_price * quantity) stored
);
create index order_items_order_idx on public.order_items(order_id);

-- updated_at triggers
create trigger trg_profiles_updated  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger trg_addresses_updated before update on public.addresses for each row execute function public.set_updated_at();
create trigger trg_products_updated  before update on public.products  for each row execute function public.set_updated_at();
create trigger trg_carts_updated     before update on public.carts     for each row execute function public.set_updated_at();
create trigger trg_orders_updated    before update on public.orders    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- ROLE HELPERS (security definer so they can be used inside RLS policies)
-- ---------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- SIGN-UP: auto-create profile + cart for every new auth user
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);

  insert into public.carts (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for any users that already exist
insert into public.profiles (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', ''), email from auth.users
on conflict (id) do nothing;

insert into public.carts (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- SAFETY TRIGGERS
-- ---------------------------------------------------------------------

-- Only admins may change a role. (SQL editor / service role has no auth.uid(), so
-- you can bootstrap the first admin with a plain UPDATE – see README.)
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;

create trigger trg_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Only one default address per user: setting a new default clears the old one.
create or replace function public.single_default_address()
returns trigger language plpgsql as $$
begin
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger trg_single_default_address before insert or update on public.addresses
  for each row execute function public.single_default_address();

-- Put stock back when an order becomes cancelled.
create or replace function public.restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products p
       set stock = p.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.product_id = p.id;
  end if;
  return new;
end $$;

create trigger trg_restock_on_cancel after update of status on public.orders
  for each row execute function public.restock_on_cancel();

-- ---------------------------------------------------------------------
-- ORDER FUNCTIONS (called from the app with supabase.rpc)
-- ---------------------------------------------------------------------

-- Turns the caller's cart into an order atomically:
-- validates stock, snapshots prices, decrements stock, empties the cart.
-- Shipping: free at ₹5,000+, otherwise ₹199 (keep in sync with src/lib/format.js).
create or replace function public.place_order(
  p_address         jsonb,
  p_payment_method  public.payment_method default 'cod',
  p_notes           text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user      uuid := auth.uid();
  v_cart      uuid;
  v_subtotal  numeric(10,2) := 0;
  v_count     integer := 0;
  v_shipping  numeric(10,2);
  v_order     uuid;
  r           record;
begin
  if v_user is null then
    raise exception 'Please sign in to place an order';
  end if;

  if coalesce(p_address->>'full_name', '') = '' or coalesce(p_address->>'phone', '') = ''
     or coalesce(p_address->>'line1', '') = '' or coalesce(p_address->>'city', '') = ''
     or coalesce(p_address->>'state', '') = '' or coalesce(p_address->>'postal_code', '') = '' then
    raise exception 'Please provide a complete shipping address';
  end if;

  select id into v_cart from public.carts where user_id = v_user;
  if v_cart is null then
    raise exception 'Your cart is empty';
  end if;

  for r in
    select ci.quantity, p.id, p.name, p.price, p.stock, p.is_active
      from public.cart_items ci
      join public.products p on p.id = ci.product_id
     where ci.cart_id = v_cart
     order by p.id
       for update of p
  loop
    if not r.is_active then
      raise exception '% is no longer available', r.name;
    end if;
    if r.stock < r.quantity then
      raise exception 'Only % left in stock for %', r.stock, r.name;
    end if;
    v_subtotal := v_subtotal + r.price * r.quantity;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'Your cart is empty';
  end if;

  v_shipping := case when v_subtotal >= 5000 then 0 else 199 end;

  insert into public.orders (order_number, user_id, payment_method, subtotal, shipping_fee, total, shipping_address, notes)
  values ('CN-' || nextval('public.order_number_seq'), v_user, p_payment_method,
          v_subtotal, v_shipping, v_subtotal + v_shipping, p_address, nullif(p_notes, ''))
  returning id into v_order;

  insert into public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity)
  select v_order, p.id, p.name, p.image_url, p.price, ci.quantity
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
   where ci.cart_id = v_cart;

  update public.products p
     set stock = p.stock - ci.quantity
    from public.cart_items ci
   where ci.cart_id = v_cart and ci.product_id = p.id;

  delete from public.cart_items where cart_id = v_cart;

  return v_order;
end $$;

-- Customers can cancel their own order while it is still pending/confirmed.
create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.user_id <> auth.uid() and not public.is_staff() then
    raise exception 'You are not allowed to cancel this order';
  end if;
  if v_order.status not in ('pending', 'confirmed') then
    raise exception 'This order can no longer be cancelled';
  end if;
  update public.orders set status = 'cancelled' where id = p_order_id;
end $$;

revoke all on function public.place_order(jsonb, public.payment_method, text) from public, anon;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.place_order(jsonb, public.payment_method, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.addresses      enable row level security;
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.carts          enable row level security;
alter table public.cart_items     enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.reviews        enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- profiles
create policy "profiles: read own or staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin updates any" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- addresses
create policy "addresses: owner full access" on public.addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories
create policy "categories: public read" on public.categories
  for select using (true);
create policy "categories: staff write" on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

-- products
create policy "products: public read active" on public.products
  for select using (is_active or public.is_staff());
create policy "products: staff write" on public.products
  for all using (public.is_staff()) with check (public.is_staff());

-- carts
create policy "carts: owner full access" on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "cart_items: owner full access" on public.cart_items
  for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- wishlist
create policy "wishlist: owner full access" on public.wishlist_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews
create policy "reviews: public read" on public.reviews
  for select using (true);
create policy "reviews: insert own" on public.reviews
  for insert with check (user_id = auth.uid());
create policy "reviews: update own" on public.reviews
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews: delete own or staff" on public.reviews
  for delete using (user_id = auth.uid() or public.is_staff());

-- orders (customers only read; creation/cancel go through the RPC functions)
create policy "orders: read own or staff" on public.orders
  for select using (user_id = auth.uid() or public.is_staff());
create policy "orders: staff update" on public.orders
  for update using (public.is_staff()) with check (public.is_staff());

create policy "order_items: read via order" on public.order_items
  for select using (
    exists (select 1 from public.orders o
             where o.id = order_id and (o.user_id = auth.uid() or public.is_staff()))
  );

-- ---------------------------------------------------------------------
-- SEED DATA (sample catalogue – edit or delete from the admin panel)
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, description, image_url) values
  ('Living Room',      'living-room',   'Sofas, chairs and tables for the heart of your home', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'),
  ('Bedroom',          'bedroom',       'Beds, mattresses and bedside storage',               'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800'),
  ('Dining',           'dining',        'Dining sets, stools and serveware',                  'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800'),
  ('Office',           'office',        'Desks and chairs for a comfortable workday',         'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800'),
  ('Decor & Lighting', 'decor-lighting','Lamps, rugs and finishing touches',                  'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800'),
  ('Storage',          'storage',       'Shelves and organisers that look good',              'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800');

insert into public.products (category_id, name, slug, description, price, compare_at_price, stock, image_url, material, dimensions, color, is_featured) values
  ((select id from public.categories where slug='living-room'), 'Oslo 3-Seater Fabric Sofa', 'oslo-3-seater-fabric-sofa',
   'A deep, supportive three-seater with high-resilience foam cushions and a solid pine frame. Removable covers make it easy to keep fresh.',
   42999, 54999, 8, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900', 'Linen-blend fabric, pine frame', '210 × 90 × 85 cm', 'Stone Grey', true),
  ((select id from public.categories where slug='living-room'), 'Aria Velvet Accent Armchair', 'aria-velvet-accent-armchair',
   'A compact statement chair with a curved back and tapered wooden legs. Perfect for reading corners.',
   15499, 18999, 14, 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=900', 'Velvet, beech wood legs', '72 × 78 × 80 cm', 'Mustard', true),
  ((select id from public.categories where slug='living-room'), 'Nordic Oak Coffee Table', 'nordic-oak-coffee-table',
   'Round coffee table with a oak-veneer top and a lower shelf for magazines and throws.',
   8999, null, 20, 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=900', 'Oak veneer, steel', '90 × 90 × 42 cm', 'Natural Oak', false),
  ((select id from public.categories where slug='bedroom'), 'Haven King Bed with Storage', 'haven-king-bed-with-storage',
   'Solid sheesham king bed with a hydraulic lift-up storage base and a upholstered headboard.',
   38999, 46999, 6, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900', 'Sheesham wood, fabric headboard', '195 × 215 × 95 cm', 'Walnut', true),
  ((select id from public.categories where slug='bedroom'), 'Luna Bedside Table', 'luna-bedside-table',
   'Two-drawer bedside table with soft-close runners and a rounded edge.',
   4499, null, 30, 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=900', 'Engineered wood', '45 × 40 × 55 cm', 'Ash White', false),
  ((select id from public.categories where slug='bedroom'), 'Cloud Memory Foam Mattress (Queen)', 'cloud-memory-foam-mattress-queen',
   'Medium-firm 8-inch mattress with a cooling gel top layer and a washable cover.',
   17999, 22999, 12, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900', 'Memory foam, HR foam', '152 × 198 × 20 cm', 'White', false),
  ((select id from public.categories where slug='dining'), 'Rustic 6-Seater Dining Set', 'rustic-6-seater-dining-set',
   'Solid mango wood table with six cushioned chairs. Seats the whole family in comfort.',
   36999, 44999, 5, 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=900', 'Mango wood', 'Table 180 × 90 × 76 cm', 'Honey Brown', true),
  ((select id from public.categories where slug='dining'), 'Teak Bar Stool (Set of 2)', 'teak-bar-stool-set-of-2',
   'Counter-height stools with a footrest and a gently dished seat.',
   6999, null, 18, 'https://images.unsplash.com/photo-1503602642458-232111445657?w=900', 'Teak wood', '38 × 38 × 65 cm', 'Natural Teak', false),
  ((select id from public.categories where slug='office'), 'ErgoFlex Mesh Office Chair', 'ergoflex-mesh-office-chair',
   'Breathable mesh back with adjustable lumbar support, 3D armrests and a smooth tilt mechanism.',
   9499, 12999, 25, 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=900', 'Mesh, nylon base', '65 × 65 × 110 cm', 'Black', true),
  ((select id from public.categories where slug='office'), 'Walnut Study Desk', 'walnut-study-desk',
   'Clean-lined desk with a cable cut-out and a roomy drawer for stationery.',
   11999, null, 10, 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=900', 'Engineered wood, walnut finish', '120 × 60 × 75 cm', 'Walnut', false),
  ((select id from public.categories where slug='decor-lighting'), 'Arc Floor Lamp', 'arc-floor-lamp',
   'A sweeping brass-finish arc lamp with a linen shade. Warm, ambient light for any corner.',
   3999, null, 40, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900', 'Metal, linen', 'H 175 cm', 'Brass', false),
  ((select id from public.categories where slug='decor-lighting'), 'Handwoven Jute Rug 5×7 ft', 'handwoven-jute-rug-5x7',
   'Natural jute rug, handwoven by artisans. Adds texture under sofas and beds.',
   4999, 6499, 22, 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=900', 'Jute', '152 × 213 cm', 'Natural', false),
  ((select id from public.categories where slug='storage'), '5-Tier Open Bookshelf', '5-tier-open-bookshelf',
   'A tall, open bookshelf with sturdy shelves and an anti-tip wall fixing.',
   7499, null, 15, 'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=900', 'Engineered wood, metal frame', '80 × 30 × 180 cm', 'Oak & Black', false);
