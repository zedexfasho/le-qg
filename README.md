# Le QG — boutique streetwear (Dakar)

Site catalogue avec commande sur WhatsApp. Le client choisit modèle, couleur, taille et quantité, et un message WhatsApp pré-rempli part vers la boutique. Pas de paiement en ligne.

- **Next.js 16** (App Router) + TypeScript strict + Tailwind CSS v4
- Site **100 % statique** (`out/`) : en ligne sur Cloudflare (https://le-qg.junior-cherif.workers.dev), déplaçable sur Vercel, Netlify ou Hostinger, sans serveur
- Données dans des fichiers (`data/`), pas de base de données (v1)

---

## 1. Avant la mise en ligne : à remplir

Tout se règle dans **`data/site.ts`** :

| Réglage | À faire |
|---|---|
| `whatsapp` | Ton numéro de commande, ex. `"+221 77 123 45 67"`. **Obligatoire** : tant qu'il est vide, WhatsApp s'ouvre sans destinataire. |
| `socials` | Tes comptes Instagram / Snapchat / TikTok, sans le `@` (vide = lien masqué). |
| `delivery` | Tes tarifs de livraison par zone (`price: 1500`…). `null` affiche « Tarif confirmé sur WhatsApp ». |
| `exchangePolicy` | Ta vraie politique d'échange (le texte actuel est un exemple). |
| `story` | Le texte de « Notre histoire » (brouillon à remplacer). |

Ensuite, supprime les **8 produits d'exemple** de `data/products.ts` et leurs dossiers d'images dans `public/products/`, puis ajoute tes vrais produits (section 3).

Le guide des tailles (mesures indicatives) se modifie dans `components/product/SizeGuide.tsx`.

---

## 2. Lancer le site sur ton ordinateur

Prérequis : [Node.js](https://nodejs.org) 20.9 ou plus.

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000.

---

## 3. Ajouter un produit (procédure pas à pas)

1. **Récupère les photos** du téléphone sur l'ordinateur (WhatsApp Web, câble, Google Drive…).
   Formats acceptés : JPG, PNG, WebP. Les photos HEIC d'iPhone ne passent pas : envoie-les-toi par WhatsApp (elles deviennent des JPG) ou règle l'appareil photo sur « Le plus compatible ».

2. **Crée un dossier** dans `imports/`, par exemple `imports/hoodie-noir/`, et mets-y les photos.
   Renomme-les simplement : `noir-1.jpg`, `noir-2.jpg`, `beige-1.jpg`…

3. **Copie** `imports/exemple/product.json` dans ce dossier et remplis-le :

   ```json
   {
     "name": "Hoodie oversize brodé",
     "category": "hoodies",
     "price": 27000,
     "condition": "Neuf avec étiquette",
     "description": "Hoodie oversize en molleton épais, broderie poitrine.",
     "dropId": "drop-novembre-2026",
     "variants": [
       { "color": "Noir",  "colorHex": "#1C1A19", "photos": ["noir-1.jpg", "noir-2.jpg"], "stock": { "M": 2, "L": 3, "XL": 1 } },
       { "color": "Beige", "colorHex": "#D9C3A0", "photos": ["beige-1.jpg"],               "stock": { "S": 1, "M": 2, "L": 0 } }
     ]
   }
   ```

   | Champ | Valeurs |
   |---|---|
   | `category` | `hoodies`, `ensembles`, `joggings`, `tshirts`, `maillots`, `chemises`, `accessoires` |
   | `price` / `oldPrice` | En FCFA, nombre entier sans espace. `oldPrice` (facultatif) = ancien prix barré |
   | `condition` | Affiché tel quel : doit être exact (« Neuf avec étiquette », « Neuf sans étiquette »…) |
   | `stock` | Tailles `XS`, `S`, `M`, `L`, `XL`, `XXL`, ou `TU` (taille unique). `0` = rupture |
   | `colorHex` | Couleur de la pastille (prends-la sur une photo avec une pipette, ex. https://imagecolorpicker.com) |
   | `slug` | Facultatif : généré à partir du nom (`hoodie-oversize-brode`) |
   | `brandLabel` | Facultatif : marque, mentionnée de façon factuelle |
   | `dropId` | Facultatif : rattache le produit à un drop de `data/drops.ts` |
   | `isNew` | Facultatif : badge « Nouveau » (activé par défaut) |

   Avec une seule couleur, tu peux omettre `photos` : toutes les photos du dossier sont utilisées.

4. **Vérifie**, puis **ajoute** :

   ```bash
   npm run add-product -- imports/hoodie-noir --dry-run
   npm run add-product -- imports/hoodie-noir
   ```

   Le script convertit les photos en WebP (1200 px + 600 px pour les mobiles), corrige l'orientation, les range dans `public/products/<slug>/`, crée l'aperçu de partage WhatsApp (`og.jpg`) et ajoute le produit dans `data/products.ts`.
   Il refuse un slug déjà existant et explique chaque erreur du JSON.

5. **Mettre à jour un stock** : ouvre `data/products.ts`, cherche le produit et change le chiffre (ex. `"M": 2` → `"M": 0`).

6. **Publie** (section 5).

### Ajouter un drop

Ajoute une entrée dans `data/drops.ts` et une image de couverture `public/drops/<id>.webp` + `<id>-sm.webp`.
`npm run placeholders` génère une couverture provisoire pour tout drop qui n'en a pas.

---

## 4. Vérifier avant de publier

```bash
npm run check
```

Lance le lint, la vérification TypeScript, les tests (message WhatsApp, prix, filtres, panier, données, contrastes) et le build. Tout doit être vert.

---

## 5. Mettre en ligne

### Option A — Cloudflare (actuel)

Le site est en ligne sur **https://le-qg.junior-cherif.workers.dev** (Cloudflare Workers, fichiers statiques, gratuit).

1. Après une modification (produit, réglage…), lance :
   ```bash
   npm run deploy
   ```
   Ça construit le site et l’envoie en ligne (environ 1 minute). Pour tout vérifier avant : `npm run check`.
2. Si Cloudflare demande de se reconnecter : `npx wrangler login`, puis clique sur **Allow** dans le navigateur.
3. L'adresse publique utilisée pour le sitemap et les aperçus WhatsApp est dans `.env.production` (`NEXT_PUBLIC_SITE_URL`).
4. Nom de domaine (`leqg.sn`…) : tableau de bord Cloudflare → **Workers & Pages → le-qg → Settings → Domains & Routes → Add → Custom domain**, puis mets la nouvelle adresse dans `.env.production` et relance `npm run deploy`.

Réglages : `wrangler.jsonc` (dossier `out/`, page 404) et `public/_headers` (cache, sécurité).

### Option B — Vercel (alternative, déploiement automatique depuis GitHub)

1. Mets le projet sur GitHub.
2. Sur https://vercel.com → **Add New… → Project** → importe le dépôt → **Deploy**. Aucun réglage à changer.
3. Chaque `git push` remet le site à jour automatiquement (environ 1 minute).
4. Nom de domaine (`leqg.sn`…) : **Settings → Domains** du projet, puis ajoute dans *Environment Variables* `NEXT_PUBLIC_SITE_URL = https://leqg.sn` (pour les liens de partage et le sitemap) et redéploie.

### Option C — Hostinger (hébergement web classique)

1. Dans `data/site.ts`, rien à changer. Lance avec l'adresse finale du site :
   ```bash
   NEXT_PUBLIC_SITE_URL=https://leqg.sn npm run build
   ```
   (sous Windows PowerShell : `$env:NEXT_PUBLIC_SITE_URL="https://leqg.sn"; npm run build`)
2. Envoie **le contenu** du dossier `out/` dans `public_html/` (Gestionnaire de fichiers ou FTP), fichier `.htaccess` compris.
3. À chaque nouveau produit : refais le build et renvoie le dossier `out/`.

Tester le résultat statique en local : `npm run build` puis `npm start`.

---

## 6. Organisation du code

```
app/            pages (accueil, shop, product/[slug], drops, panier, notre-histoire, infos, 404, sitemap, robots, manifest)
components/     brand (logo, guirlande, icônes), layout (header, footer, WhatsApp flottant), product, shop, cart, home, ui
data/           site.ts (réglages), products.ts, drops.ts, categories.ts
lib/            catalog.ts (SEUL accès aux données), whatsapp.ts, format.ts, filters.ts, cart.ts, cart-store.ts, storage.ts
scripts/        add-product.ts, generate-brand.ts, generate-placeholders.ts
tests/          tests Vitest
public/brand/   logos fournis (logo-*.png) + versions détourées générées
```

- **Logos** : `public/brand/logo-wordmark.png`, `logo-icon.png`, `logo-badge.png`. Après un changement de logo : `npm run brand` (versions détourées, favicons, icônes PWA, image de partage). Pour passer à des SVG, change les chemins dans `components/brand/Logo.tsx`.
- **Message WhatsApp** : une seule fonction, `buildWhatsAppMessage()` dans `lib/whatsapp.ts`, utilisée par la fiche produit et le panier.
- **Panier** : stocké dans le navigateur (`localStorage`), avec repli en mémoire si le stockage est bloqué (navigation privée).

### Préparé pour la v2 (back-office + Supabase)

Les pages ne lisent jamais `data/` directement : tout passe par les fonctions asynchrones de `lib/catalog.ts`.
Pour brancher Supabase, il suffira de réécrire ces fonctions (et de passer à un rendu serveur pour le stock en temps réel) sans toucher aux pages ni aux composants.
