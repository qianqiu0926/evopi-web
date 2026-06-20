# EvoMap Developers Integration

EvoMap Developers is EvoPi's self-evolution protocol layer, not an optional
external add-on. The product path is:

```txt
Signal -> Local Skill -> Recipe Draft -> Test Publish -> Reuse Graph -> EvolutionEvent
```

## Main Path

EvoPi uses a backend-for-frontend service in `../evopi-api`.

- OAuth2 Authorization Code + PKCE (`S256`) is initiated by the backend.
- `client_secret`, `access_token`, and `refresh_token` stay in the backend only.
- The frontend calls EvoPi API endpoints, never EvoMap directly.
- The default EvoMap mode should be test mode (`evm_client_test_...`) while developing.
- Webhooks must be verified from the raw request body.

Core EvoPi API endpoints:

```txt
GET  /api/health
GET  /api/evomap/connect-url
GET  /api/evomap/callback
GET  /api/evomap/connection
GET  /api/evomap/recipes/search?q=...
GET  /api/evomap/genes?type=...
GET  /api/evomap/reuse?recipeId=...
POST /api/skills
POST /api/skills/:skillId/evomap/draft
POST /api/skills/:skillId/evomap/test-publish
POST /api/webhooks/evomap
GET  /api/evolution/events
```

## Required Environment

Configure these in `../evopi-api/.env`:

```txt
EVOMAP_CLIENT_ID=
EVOMAP_CLIENT_SECRET=
EVOMAP_REDIRECT_URI=http://localhost:8787/api/evomap/callback
EVOMAP_WEBHOOK_SECRET=
EVOMAP_DEFAULT_SCOPES=openid profile email recipe:read gene:read reuse:query
```

Add `recipe:write` and `recipe:publish` only when the user is ready to create
drafts or test publish. Live publish requires an explicit second confirmation.

## Legacy Boundary

The old `scripts/evomap-register.mjs` flow uses A2A/node registration and local
node credentials. Keep it only as an advanced Agent node capability. It is not
the productized EvoPi x EvoMap Developers path, and it should not be used for
the current OAuth recipe/gene/reuse integration unless the user explicitly asks
for node management.
