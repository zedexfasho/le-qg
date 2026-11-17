-- Rôle des membres de l'équipe : « admin » (tout le dashboard) ou « livreur » (page Livraisons seulement)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';

-- Codes promo
CREATE TABLE promo_codes (
  code TEXT PRIMARY KEY,                -- en majuscules, ex. AWA10
  kind TEXT NOT NULL,                   -- percent (pourcentage) | fixed (montant en FCFA)
  value INTEGER NOT NULL,
  label TEXT,                           -- usage interne : « Influenceuse Awa », « Premier achat »…
  min_subtotal INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,                     -- NULL = illimité
  first_order_only INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,                       -- AAAA-MM-JJ (inclus), NULL = tout de suite
  ends_at TEXT,                         -- AAAA-MM-JJ (inclus), NULL = sans fin
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Remise appliquée à la commande (total = sous-total - remise + livraison)
ALTER TABLE orders ADD COLUMN promo_code TEXT;
ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
CREATE INDEX orders_promo ON orders(promo_code);
