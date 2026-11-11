# API Contract: Vanguard Vault

Base path: `/api`. JSON field names use camelCase. Errors use
`{"error":{"code":"...","message":"..."}}` with an appropriate HTTP status.

The server derives `memberId` and `role` only from a verified JWT. It never accepts
them as trusted values from a request body, query string, or path parameter.

## Public

| Method and path | Purpose |
| --- | --- |
| `GET /cards?game=vanguard&q=&type=&rarity=&limit=&offset=` | Search the local Vanguard catalog. |
| `GET /cards/{cardId}` | Read Vanguard card details from PostgreSQL. |
| `GET /cards/{cardId}/image` | Stream a PokéWallet image through Go; key remains server-side and responses are cached for 24 hours. |
| `GET /decks?game=vanguard&q=` | List public Vanguard decks. |
| `GET /decks/{deckId}` | Read a public Vanguard deck; private decks are visible only to their owner. |
| `GET /decks/{deckId}/reviews` | Read reviews for a public Vanguard deck. |

List responses use `{items, total, limit, offset}`. Card metadata, search, filters,
decks, and collections use PostgreSQL; normal catalog requests do not call the
PokéWallet metadata/search API.

## Authentication and member

| Method and path | Purpose |
| --- | --- |
| `POST /auth/register` | Create a member with role `member`; hash password with bcrypt. |
| `POST /auth/login` | Verify password and return a signed JWT and safe profile. |
| `GET /me` | Read the signed-in member profile. |
| `PATCH /me` | Change display name. |
| `PUT /me/password` | Verify current password and set a new bcrypt hash. |
| `GET /me/decks` | List the signed-in member's Vanguard decks. |
| `POST /decks` | Create a Vanguard deck for the signed-in member. |
| `PUT /decks/{deckId}` | Edit an owned deck's name, description, or public state. |
| `DELETE /decks/{deckId}` | Delete an owned Vanguard deck. |
| `PUT /decks/{deckId}/cards` | Replace a deck's card list with `[{cardId, quantity}]`; all cards must be Vanguard. |
| `GET /me/collection?game=vanguard` | List the signed-in member's Vanguard collection. |
| `PUT /me/collection/{cardId}` | Set owned quantity for one Vanguard card. |
| `DELETE /me/collection/{cardId}` | Remove a card from the signed-in member's collection. |
| `POST /decks/{deckId}/reviews` | Create or update the signed-in member's review of a public Vanguard deck. |

Logout clears the token in the frontend. Protected requests send
`Authorization: Bearer <token>`.

## Admin

All `/admin/*` routes require a verified JWT whose role is `admin`.

| Method and path | Purpose |
| --- | --- |
| `POST /admin/cards` | Add a Vanguard card. |
| `PUT /admin/cards/{cardId}` | Edit a Vanguard card. |
| `DELETE /admin/cards/{cardId}` | Delete a Vanguard card not used by a deck or collection. |
| `GET /admin/members` | List member profiles without password hashes. |
| `PATCH /admin/members/{memberId}/role` | Set `member` or `admin`; actor ID comes from JWT. |
| `DELETE /admin/members/{memberId}` | Delete a member and dependent records. |
| `GET /admin/decks` | List Vanguard decks for moderation. |
| `DELETE /admin/decks/{deckId}` | Remove an inappropriate deck. |
| `GET /admin/reviews` | List Vanguard reviews for moderation. |
| `DELETE /admin/reviews/{reviewId}` | Remove an inappropriate review. |

## PokéWallet source fields used by the one-time seed

- `/cfv/sets`: `name`, `set_code`, `set_id`, `card_count`, `language`, `release_date`.
- `/cfv/sets/{set_id}?page=1&limit=200`: `id`, `card_info.name`,
  `card_info.card_type`, `card_info.unit`, `card_info.nation`, `card_info.clan`,
  `card_info.rarity`, `card_info.card_text`, `card_info.set_name`,
  `card_info.set_code`, `card_info.product_type`, and `images.languages`.
- Seed paginates every set (limit 200), includes every `product_type: "card"`
  record with an ID and name, and excludes sealed or unclassified products.
  Missing type/rarity values are marked `ไม่ระบุ`; the checkpoint lets a rerun
  resume after the API free-tier rate limit.
- Image IDs are used at `/cfv/images/{id}` by Go with the API key. SQL stores the
  source image URL; it does not contain downloaded image files.
