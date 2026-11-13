# Le QG — boutique streetwear (Dakar)

Site catalogue avec commande sur WhatsApp. Le client choisit modèle, couleur, taille et quantité, et un message WhatsApp pré-rempli part vers la boutique. Pas de paiement en ligne.

- **Next.js 16** (App Router) + TypeScript strict + Tailwind CSS v4
- Site **statique** (`out/`) en ligne sur Cloudflare (https://le-qg.junior-cherif.workers.dev)
- **Dashboard** sur `/admin` : commandes, clients, produits et stock, analyses du business
- API : un Worker Cloudflare (`worker/`) + base **D1** (SQLite) + photos dans **KV**, tout dans l'offre gratuite

---

## 1. Avant la mise en ligne : à remplir

Tout se règle dans **`data/site.ts`** :

| Réglage | À faire |
|---|---|
| `whatsapp` | Ton numéro de commande, ex. `"+221 77 123 45 67"`. **Obligatoire** : tant qu'il est vide, WhatsApp s'ouvre sans destinataire. |
| `socials` | Tes comptes Instagram / Snapchat / TikTok, sans le `@` (vide = lien masqué). |
| `delivery` | Tes tarifs de livraison par zone (`price: 1500`…). Ils s'affichent sur la page Infos **et dans le formulaire de commande**, et sont ajoutés au total des commandes passées sur le site. `null` = « Tarif à confirmer » (frais à 0, tu les règles dans la commande). |
| `exchangePolicy` | Ta vraie politique d'échange (le texte actuel est un exemple). |
| `story` | Le texte de « Notre histoire » (brouillon à remplacer). |

Ensuite, dans le dashboard (**Produits**), complète et publie tes produits (section 3).

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

## 3. Le dashboard (`/admin`)

Adresse : **https://le-qg.junior-cherif.workers.dev/admin/** (non référencée par Google). Fonctionne sur téléphone.

### Comment arrivent les commandes

Le client a deux boutons, sur la fiche produit et dans le panier :

- **« Commander sur le site »** (sans WhatsApp) : un formulaire demande nom, numéro, zone, adresse, moyen de paiement et un message facultatif. Rien n'est payé en ligne. La commande arrive **complète** dans le dashboard (client, zone, frais de livraison, paiement, message dans la note), la fiche client est créée, le panier se vide et le client voit sa référence. Si un article n'a plus assez de stock, le formulaire le dit avant l'envoi.
- **« Commander sur WhatsApp »** : le site enregistre la commande **et** ajoute une référence au message WhatsApp : « Je veux commander (réf. QG-7K2M9QX) ». Tu complètes les coordonnées dans la commande. Si le client n'envoie jamais le message, elle passe en **Sans suite** après 3 jours.

Ensuite, dans les deux cas :

1. La commande apparaît dans **Commandes → À traiter** avec le statut **Nouvelle** (et une alerte Telegram si elle est réglée). L'historique indique « Commande passée avec le formulaire du site » ou « (WhatsApp) ».
2. Tu appelles ou écris au client pour confirmer, puis dans la commande : **Confirmer** (le stock est déduit) → **En livraison** → **Livrée**, et **Marquer payée**. Un bouton prépare le message WhatsApp adapté à chaque étape.
3. **Annuler** remet le stock en place.

Le formulaire est protégé contre les robots (champ invisible) et limité à 20 commandes par heure et par connexion. Le client peut cocher « Mémoriser mes coordonnées » : elles restent alors sur son téléphone uniquement.

Pour retrouver une commande, tape la référence (`QG-…`), le numéro ou le nom dans la recherche.
Les ventes en boutique, sur Instagram ou par téléphone se saisissent avec **Saisir une commande**.

### Les pages

| Page | Contenu |
|---|---|
| Accueil | Chiffres du jour et du mois, commandes à traiter, alertes de stock |
| Commandes | Liste filtrable (à traiter, non payées, par origine…), fiche détaillée avec historique et notes. Une **pastille** sur le menu (et dans l'onglet du navigateur) compte les commandes à confirmer ; elle et les listes se mettent à jour toutes seules (toutes les 45 s) quand une commande arrive. |
| Clients | Fichier clients créé automatiquement à partir des commandes (numéro, quartier, total dépensé, notes) |
| Produits | Ajout / modification des produits, photos, tailles et **stock** (modifiable directement dans la liste) |
| Analyses | Chiffre d'affaires, panier moyen, taux de confirmation, meilleures ventes, tailles, zones, origines, meilleurs clients (7 j, 30 j, 90 j, 12 mois) |
| Réglages | Équipe (inviter quelqu'un), mot de passe, alerte Telegram, publication du site |

### Ajouter un produit

1. **Produits → Ajouter un produit.**
2. Nom, catégorie, prix, état, description ; puis une ligne par coloris avec ses **photos** (prises directement depuis le téléphone, elles sont réduites automatiquement) et le **stock par taille**.
3. Coche **Publié**, enregistre.
4. **Réglages → Publier le site** pour que la fiche produit apparaisse sur le site (environ 2 minutes).

Le **stock** et les **prix** sont lus en direct par le site : les modifier ne demande pas de publication. Les nouveaux produits, photos et textes, eux, en demandent une.

Les drops se règlent toujours dans `data/drops.ts` (image de couverture `public/drops/<id>.webp` + `<id>-sm.webp`). Un drop n'apparaît sur le site que lorsqu'au moins un produit publié lui est rattaché (champ « Drop » de la fiche produit) : les drops d'exemple restent donc invisibles.

### Accès et équipe

- Le **premier compte** se crée depuis l'ordinateur, une seule fois (le mot de passe est demandé de façon masquée) :
  ```bash
  npm run admin:create -- --remote
  ```
- Ensuite, **Réglages → Équipe → Inviter** : un mot de passe provisoire s'affiche, à transmettre à la personne. Elle devra le changer à sa première connexion. Tout le monde a les mêmes droits.
- Une personne qui part : **Désactiver** (ses sessions sont coupées immédiatement).

### Alerte Telegram à chaque nouvelle commande (facultatif)

1. Sur Telegram, ouvre **@BotFather** → `/newbot` → choisis un nom. Il te donne un **jeton**.
2. Envoie un message quelconque à ton nouveau bot, puis ouvre `https://api.telegram.org/bot<JETON>/getUpdates` dans le navigateur : le nombre après `"chat":{"id":` est ton **chat id**. (Pour un groupe : ajoute le bot au groupe et écris dans le groupe ; l'id commence par `-`.)
3. Enregistre-les dans Cloudflare (chaque commande demande la valeur : colle-la) :
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```
   ```bash
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```
4. **Réglages → Envoyer un test**.

### Publication automatique (bouton « Publier le site »)

Le bouton lance le workflow GitHub `.github/workflows/deploy.yml` (récupère le catalogue, construit, déploie). Un push sur `main` le lance aussi.

1. **Jeton Cloudflare** : https://dash.cloudflare.com/profile/api-tokens → *Create Token* → modèle **Edit Cloudflare Workers**, en ajoutant la permission **Account → D1 → Edit**. Note aussi ton **Account ID** (page Workers & Pages, colonne de droite).
2. Sur GitHub, dépôt → **Settings → Secrets and variables → Actions → New repository secret** : `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`.
3. **Jeton GitHub** pour le bouton : https://github.com/settings/personal-access-tokens → *Fine-grained token* → accès au seul dépôt `le-qg` → permission **Actions : Read and write**. Puis :
   ```bash
   npx wrangler secret put GITHUB_TOKEN
   ```

Sans ces réglages, `npm run deploy` depuis l'ordinateur fait la même chose.

---

## 4. Vérifier avant de publier

```bash
npm run check
```

Lance le lint, la vérification TypeScript (site et Worker), les tests (message WhatsApp, prix, filtres, panier, données, contrastes, commandes, stock, analyses, mots de passe) et le build. Tout doit être vert.

---

## 5. Mettre en ligne

### Option A — Cloudflare (actuel)

Le site est en ligne sur **https://le-qg.junior-cherif.workers.dev** (Cloudflare Workers + D1 + KV, offre gratuite).

1. Après une modification (produit, réglage…), lance :
   ```bash
   npm run deploy
   ```
   Ça récupère le catalogue du dashboard, construit le site, met la base à jour et envoie le tout en ligne (environ 1 minute). Pour tout vérifier avant : `npm run check`.
2. Si Cloudflare demande de se reconnecter : `npx wrangler login`, puis clique sur **Allow** dans le navigateur.
3. L'adresse publique utilisée pour le sitemap et les aperçus WhatsApp est dans `.env.production` (`NEXT_PUBLIC_SITE_URL`).
4. Nom de domaine (`leqg.sn`…) : tableau de bord Cloudflare → **Workers & Pages → le-qg → Settings → Domains & Routes → Add → Custom domain**, puis mets la nouvelle adresse dans `.env.production` et relance `npm run deploy`.

Réglages : `wrangler.jsonc` (dossier `out/`, base D1, photos dans KV, tâche quotidienne) et `public/_headers` (cache, sécurité).

Base de données : `npm run db:migrate` applique les migrations (`migrations/`) ; `npm run db:seed` copie `data/catalog.json` dans la base (une seule fois, au départ).

> Les options B et C n'hébergent que la vitrine : le dashboard, l'enregistrement des commandes et le stock en direct ont besoin de Cloudflare (Worker + D1).

### Option B — Vercel (vitrine seule)

1. Mets le projet sur GitHub.
2. Sur https://vercel.com → **Add New… → Project** → importe le dépôt → **Deploy**. Aucun réglage à changer.
3. Chaque `git push` remet le site à jour automatiquement (environ 1 minute).
4. Nom de domaine (`leqg.sn`…) : **Settings → Domains** du projet, puis ajoute dans *Environment Variables* `NEXT_PUBLIC_SITE_URL = https://leqg.sn` (pour les liens de partage et le sitemap) et redéploie.

### Option C — Hostinger (vitrine seule)

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
app/(site)/     pages publiques (accueil, shop, product/[slug], drops, panier, notre-histoire, infos)
app/admin/      dashboard (connexion, commandes, clients, produits, analyses, réglages)
components/     brand, layout, product, shop, cart, checkout, home, ui, admin
data/           site.ts (réglages), catalog.json (instantané du catalogue), drops.ts, categories.ts
lib/            catalog.ts, whatsapp.ts, orders.ts (statuts, stock), checkout.ts (formulaire de commande), analytics.ts, order-capture.ts, admin/
worker/         API Cloudflare : index.ts (routes), auth, orders, products, customers, media, analytics, notify, publish
migrations/     schéma de la base D1
scripts/        catalog-pull, catalog-seed, create-admin, generate-brand, generate-placeholders
tests/          tests Vitest
```

- **Message WhatsApp** : une seule fonction, `buildWhatsAppMessage()` dans `lib/whatsapp.ts`, utilisée par la fiche produit et le panier.
- **Formulaire de commande** : les règles (`validateCheckout()` dans `lib/checkout.ts`) sont partagées par la page et par l'API, qui revérifie tout (prix, stock, coordonnées).
- **Panier** : stocké dans le navigateur (`localStorage`), avec repli en mémoire si le stockage est bloqué (navigation privée).
- **Polices** : Fredoka et Inter sont hébergées dans `app/fonts` (pas de dépendance à Google Fonts au moment du build).
- **Catalogue** : la base D1 fait foi. Avant chaque build, `npm run catalog:pull` l'écrit dans `data/catalog.json` et les pages sont générées à partir de ce fichier. Stock et prix sont ensuite rafraîchis en direct par `/api/stock`.
- **Sécurité** : mots de passe hachés (PBKDF2), session en cookie HttpOnly, vérification d'origine sur toutes les écritures, limitation des tentatives de connexion et des commandes par IP.

### Travailler sur le dashboard en local

```bash
npm run db:migrate:local
```
```bash
npm run db:seed:local
```
```bash
npm run admin:create -- --local
```

Puis, dans deux terminaux : `npm run dev:api` (API sur le port 8787) et `npm run dev` (site sur le port 3000, qui renvoie `/api` vers l'API). Le fichier `.dev.vars` (non versionné) contient `DEV_ORIGIN=http://localhost:3000`.
