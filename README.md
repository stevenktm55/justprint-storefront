# JustPrint Storefront

Application **storefront multi-boutique** JustPrint.  
Une seule app Next.js, intégrable en iframe sur plusieurs sites clients, sélectionnés via le paramètre URL `shop`.

RawMoto est la **première boutique configurée** — pas le nom du projet.

## JustPrint vs JustPrint Storefront

| | Rôle |
|---|---|
| **JustPrint** | Plateforme / API centrale (catalogue, configurations, aperçus, production). Backend hors de ce dépôt. |
| **JustPrint Storefront** | Interface client (ce dépôt) : parcours configurateur, aperçus locaux mock, bridge Shopify / iframe. |

Ce dépôt ne contient **pas** le backend JustPrint.

## Multi-boutique

Chaque boutique a une configuration `StorefrontTenantConfig` :

- identité (id, name, logo)
- thème (couleurs)
- textes configurateur
- origines parent autorisées (`allowedParentOrigins`)
- features (3D/2D, logos, panier Shopify, comptes, etc.)

Lookup centralisé :

```ts
getTenantConfig(shopId)
```

RawMoto : `src/tenants/rawmoto.ts` (`id: "rawmoto"`).

Contexte React : `StorefrontTenantProvider` expose `tenant`, `shopId`, `theme`, `features`, `allowedParentOrigins`.  
Les composants ne doivent pas relire `?shop=` eux-mêmes.

## Paramètre `shop`

Route principale :

```text
/configurator?shop=rawmoto
```

| Environnement | `shop` absent | `shop` inconnu |
|---|---|---|
| **Development** | défaut `NEXT_PUBLIC_DEFAULT_SHOP` (`rawmoto`) | erreur propre |
| **Production** | erreur propre | erreur propre |

Jamais de fallback silencieux vers une autre boutique.

## Mode mock

`NEXT_PUBLIC_JUSTPRINT_MODE=mock` (défaut) :

- catalogue local RawMoto (motos 2D/3D, designs, logos)
- configurations simulées en mémoire (publicId / editToken fictifs)
- aperçus locaux inchangés
- **aucun backend requis**

## Mode remote

`NEXT_PUBLIC_JUSTPRINT_MODE=remote` + `NEXT_PUBLIC_JUSTPRINT_API_URL` (ex. `https://www.justprint.app`) :

- `POST /api/storefront/configurations` à la confirmation moto + design
- `PATCH` automatique (debounce ~700 ms) avec `X-JustPrint-Edit-Token`
- `POST …/finalize` avant `JUSTPRINT_ADD_TO_CART` (le message utilise le `publicId`)
- catalogue : fallback mock tant que `/api/storefront/bootstrap` n’existe pas
- les composants React n’appellent jamais `fetch` directement
- brouillon `localStorage` conservé en cas d’indisponibilité (`editToken` jamais exposé UI / panier / logs)

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir : [http://localhost:3000/configurator?shop=rawmoto](http://localhost:3000/configurator?shop=rawmoto)

## Variables d’environnement

Voir `.env.example` :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | `development` \| `production` \| `preview` |
| `NEXT_PUBLIC_JUSTPRINT_MODE` | `mock` \| `remote` |
| `NEXT_PUBLIC_JUSTPRINT_API_URL` | Base API JustPrint (remote) |
| `NEXT_PUBLIC_DEFAULT_SHOP` | Défaut local si `shop` absent |

Aucune donnée sensible dans les variables `NEXT_PUBLIC_*`.

## Déploiement Vercel

Projet Vercel cible : **`justprint-storefront`**.

```bash
npm install
npm run build
```

Sur Vercel, définir notamment :

```text
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_JUSTPRINT_MODE=mock
NEXT_PUBLIC_DEFAULT_SHOP=rawmoto
```

URL attendue après déploiement :

```text
/configurator?shop=rawmoto
```

## Intégration iframe

Headers CSP `frame-ancestors` (pas de `X-Frame-Options: DENY` / `SAMEORIGIN`) :

- `https://rawmoto.fr`
- `https://www.rawmoto.fr`
- localhost (développement uniquement)
- domaines Shopify / myshopify à ajouter plus tard

Exemple d’embed :

```html
<iframe
  src="https://<vercel-app>/configurator?shop=rawmoto"
  title="JustPrint Storefront — RawMoto"
  allow="fullscreen"
></iframe>
```

## Sécurité postMessage

**Entrant** : origine vérifiée strictement contre la liste autorisée (jamais `"*"`).

**Sortant** (configuration complétée) :

- origine parent autorisée lorsqu’elle est connue (referrer matching)
- `"*"` **uniquement en développement local** (commentaire explicite dans le code)
- production : jamais `"*"`

RawMoto — origines parent préparées :

- `https://rawmoto.fr`
- `https://www.rawmoto.fr`
- (futur) domaine myshopify RawMoto

## Configuration RawMoto

| Champ | Valeur |
|---|---|
| id | `rawmoto` |
| name | RawMoto |
| couleurs | inchangées (`#ff5a00`, `#f4f4f2`, `#0a0a0a`) |
| catalogue | motos mock 2D/3D, designs, catégories logos |
| features | aperçus 2D/3D, bibliothèque logos, placement auto |

Le parcours produit RawMoto (5 étapes, sticky preview, localStorage, etc.) est conservé.

## Architecture

```text
src/
  app/configurator/page.tsx     # résout ?shop=
  tenants/                      # configs boutique + getTenantConfig
  context/StorefrontTenantContext.tsx
  context/StorefrontContext.tsx # bootstrap JustPrint + sync
  lib/shopify-bridge.ts         # postMessage sécurisé
  lib/justprint/                # client mock / remote
  types/tenant.ts
```

## Scripts

```bash
npm run lint
npm run build
npm start
```

## Suite (hors scope)

1. Backend JustPrint réel
2. Ajout panier Shopify réel
3. Nouveaux tenants clients
4. Domaines Shopify preview dans CSP / `allowedParentOrigins`
