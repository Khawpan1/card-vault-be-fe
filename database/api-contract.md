# API Contract: Vanguard Vault

Base path: `/api`. JSON field names use camelCase. Errors use
`{"error":{"code":"...","message":"..."}}` with an appropriate HTTP status.

The server derives `memberId` and `role` only from a verified JWT. It never accepts
them as trusted values from a request body, query string, or path parameter.

## Public

| Method and path | Purpose |
| --- | --- |
| `GET /cards?game=vanguard&q=&type=&rarity=&setName=&rarityExact=&grade=&nation=&clan=&unit=&limit=&offset=` | Search the Vanguard catalog by name and dropdown values. `clan=__none__` selects cards without a recorded clan. |
| `GET /cards/filters` | List distinct values as `{sets, rarities, grades, nations, clans, units}`. |
| `GET /cards/{cardId}` | Read Vanguard card details from PostgreSQL. |
| `GET /cards/{cardId}/image` | Redirect to a stored TCGTracking image or stream a legacy PokéWallet image through Go. |
| `GET /decks?game=vanguard&q=` | List public Vanguard decks. |
| `GET /decks/{deckId}` | Read a public Vanguard deck; private decks are visible only to their owner. |
| `GET /decks/{deckId}/reviews` | Read reviews for a public Vanguard deck. |

List responses use `{items, total, limit, offset}`. Card metadata, search, filters,
decks, and collections use PostgreSQL; normal catalog requests do not call the
external card metadata API.

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
| `PUT /decks/{deckId}/cards` | Replace a deck's `{cards: [{cardId, quantity}]}`. Each Vanguard card ID can appear once with a quantity from 1 to 4. |
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
| `POST /admin/cards` | Add a Vanguard card with optional `grade`, `nation`, `clan`, and `unit`. |
| `PUT /admin/cards/{cardId}` | Edit a Vanguard card and its attributes. |
| `DELETE /admin/cards/{cardId}` | Delete a Vanguard card not used by a deck or collection. |
| `GET /admin/members?limit=20&offset=0` | List member profiles without password hashes, with the total count. |
| `PATCH /admin/members/{memberId}/role` | Set `member` or `admin`; actor ID comes from JWT. |
| `DELETE /admin/members/{memberId}` | Delete a member and dependent records. |
| `GET /admin/decks?limit=20&offset=0` | List public Vanguard decks for moderation, with the total count. |
| `DELETE /admin/decks/{deckId}` | Remove an inappropriate public Vanguard deck. |
| `GET /admin/reviews?limit=20&offset=0` | List Vanguard deck reviews for moderation, with the total count. |
| `DELETE /admin/reviews/{reviewId}` | Remove an inappropriate review. |

## Open TCG API fields used by the seed

- `/v1/16/sets` provides the set ID, name, and abbreviation.
- `/v1/16/sets/{id}/cards` provides product ID, name, rarity, image URL, and Vanguard fields such as `ext_data.unit`, `ext_data.nation`, and `ext_data.description`.
- The seed stores `tcgtracking:{productId}` as the source ID and saves the public image URL.
