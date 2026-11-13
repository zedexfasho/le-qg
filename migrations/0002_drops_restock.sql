-- Drops gérés depuis le dashboard (avant : data/drops.ts)
CREATE TABLE drops (
  id TEXT PRIMARY KEY,                  -- lien de la page, ex. drop-decembre-2026
  title TEXT NOT NULL,
  date TEXT NOT NULL,                   -- date ISO de l'arrivage
  description TEXT,
  cover TEXT,                           -- /media/<id>.webp (photo envoyée depuis le dashboard)
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Reprise des deux drops qui étaient écrits dans data/drops.ts (les produits y sont déjà rattachés).
-- Couverture par défaut : à remplacer depuis le dashboard (Produits › Drops).
INSERT OR IGNORE INTO drops (id, title, date, description, cover) VALUES
  ('drop-novembre-2026', 'Drop de novembre', '2026-11-06T10:00:00.000Z', 'Hoodies épais, ensembles coton et cargos : de quoi tenir les soirées fraîches de la saison.', NULL),
  ('drop-octobre-2026', 'Drop d''octobre', '2026-10-15T10:00:00.000Z', 'Maillots rétro, chemises wax et accessoires pour finir la saison des pluies en beauté.', NULL);

-- « Me prévenir du retour » : demandes laissées par les clients sur une fiche produit
CREATE TABLE restock_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  product_name TEXT NOT NULL,           -- copie au moment de la demande
  color TEXT NOT NULL,
  size TEXT,                            -- NULL = n'importe quelle taille
  phone TEXT NOT NULL,                  -- format 221XXXXXXXXX
  name TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente',  -- en_attente | prevenu | annulee
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  notified_at TEXT
);
CREATE INDEX restock_status ON restock_requests(status, created_at);
CREATE INDEX restock_variant ON restock_requests(slug, color);
