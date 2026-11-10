-- Le QG — plateforme de commandes (Cloudflare D1 / SQLite)
-- Appliquer : npx wrangler d1 migrations apply le-qg-db --remote   (--local en développement)

-- Catalogue : le produit complet (couleurs, photos, stock) est stocké en JSON,
-- au même format que lib/types.ts → Product.
CREATE TABLE products (
  slug TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,           -- format 221XXXXXXXXX
  name TEXT,
  district TEXT,                        -- quartier
  zone TEXT,                            -- zone de livraison (Dakar, Banlieue, Régions…)
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,             -- QG-XXXXXXX, affichée dans le message WhatsApp
  status TEXT NOT NULL DEFAULT 'nouvelle',
  source TEXT NOT NULL DEFAULT 'site',
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  district TEXT,
  delivery_zone TEXT,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  paid INTEGER NOT NULL DEFAULT 0,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  confirmed_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT
);
CREATE INDEX orders_status ON orders(status, created_at);
CREATE INDEX orders_created ON orders(created_at);
CREATE INDEX orders_customer ON orders(customer_id);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,                   -- copie au moment de la commande
  category TEXT,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  image TEXT
);
CREATE INDEX order_items_order ON order_items(order_id);

-- Historique de chaque commande (création, statut, modification…)
CREATE TABLE order_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  user_id INTEGER,
  user_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX order_events_order ON order_events(order_id);

-- Équipe (accès au dashboard)
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,          -- SHA-256 du jeton (le jeton lui-même n'est jamais stocké)
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Limitation des tentatives (connexion, commandes du site)
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
