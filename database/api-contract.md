# API Contract: Card Archive and Deck Builder

Base path: `/api`. JSON field names use camelCase. Errors use
`{"error":{"code":"...","message":"..."}}` with an appropriate HTTP status.

The server derives `memberId` and `role` only from a verified JWT. It never accepts
them as trusted values from a request body, query string, or path parameter.

## Public

| Method and path | Purpose |
| --- | --- |
| `GET /cards?game=&q=&type=&rarity=&limit=&offset=` | Search and filter the local card catalog. |
| `GET /cards/{cardId}` | Get local card details. |
| `GET /decks?game=&q=` | List public decks. |
| `GET /decks/{deckId}` | Read a public deck; private decks are visible only to their owner. |
| `GET /decks/{deckId}/reviews` | Read reviews for a public deck. |

List responses use `{items, total, limit, offset}`. The API reads the local PostgreSQL
database only; it does not call card-provider APIs during normal page requests.

## Authentication and member

| Method and path | Purpose |
| --- | --- |
| `POST /auth/register` | Create a member with role `member`; hash the password with bcrypt. |
| `POST /auth/login` | Verify the password and return a signed JWT and safe member profile. |
| `GET /me` | Read the signed-in member profile. |
| `PATCH /me` | Change the member's display name. |
| `PUT /me/password` | Verify the current password and set a new bcrypt hash. |
| `GET /me/decks` | List the signed-in member's decks. |
| `POST /decks` | Create a deck for the signed-in member. |
| `PUT /decks/{deckId}` | Edit an owned deck's name, description, or public state. |
| `DELETE /decks/{deckId}` | Delete an owned deck. |
| `PUT /decks/{deckId}/cards` | Replace a deck's card list with `[{cardId, quantity}]`; all cards must match the deck game. |
| `GET /me/collection?game=` | List the signed-in member's collected cards. |
| `PUT /me/collection/{cardId}` | Set the owned quantity for one card. |
| `DELETE /me/collection/{cardId}` | Remove a card from the signed-in member's collection. |
| `POST /decks/{deckId}/reviews` | Create or update the signed-in member's review of a deck. |

With stateless JWT, logout clears the token in the frontend. It does not require a
server endpoint. Protected requests send `Authorization: Bearer <token>`.

## Admin

All `/admin/*` routes require a verified JWT whose role is `admin`.

| Method and path | Purpose |
| --- | --- |
| `POST /admin/cards` | Add a card to the local catalog. |
| `PUT /admin/cards/{cardId}` | Edit a card. |
| `DELETE /admin/cards/{cardId}` | Delete a card that is not in a deck or collection. |
| `GET /admin/members` | List member profiles without password hashes. |
| `PATCH /admin/members/{memberId}/role` | Set `member` or `admin`; the actor ID comes from the JWT. |
| `DELETE /admin/members/{memberId}` | Delete a member; dependent decks, reviews, and collection rows cascade. |
| `GET /admin/decks` | List decks for moderation. |
| `DELETE /admin/decks/{deckId}` | Remove an inappropriate deck. |
| `GET /admin/reviews` | List reviews for moderation. |
| `DELETE /admin/reviews/{reviewId}` | Remove an inappropriate review. |

## Card source mapping used by the one-time seed

- Yu-Gi-Oh!: YGOPRODeck v7 `cardinfo.php`; source fields include `id`, `name`,
  `type`, `desc`, `card_sets[].set_rarity`, and `card_images[].image_url`.
- Magic: Scryfall `/cards/search`; source fields include `id`, `name`, `type_line`,
  `rarity`, `oracle_text`, and `image_uris` (or the first face's image URI).
- Pokémon: Pokémon TCG API v2 `/cards`; source fields include `id`, `name`,
  `supertype`/`subtypes`/`types`, `rarity`, `rules`/`abilities`/`attacks`, and
  `images.large`.

The seed stores source identifiers and image URLs. It does not download image files.
