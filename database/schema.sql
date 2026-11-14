-- โครงสร้างฐานข้อมูลคลังการ์ดและจัดเด็ค (PostgreSQL 14+)
BEGIN;

CREATE TABLE members (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(50) NOT NULL CHECK (char_length(btrim(display_name)) > 0),
    role          VARCHAR(10) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_members_email_lower ON members (lower(email));

-- source_id เก็บรหัสการ์ดจากแหล่งข้อมูลเดิม
CREATE TABLE cards (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    game        VARCHAR(20) NOT NULL
                CHECK (game IN ('vanguard')),
    source_id   VARCHAR(150) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    type        VARCHAR(255) NOT NULL,
    rarity      VARCHAR(100) NOT NULL,
    grade       VARCHAR(20) NOT NULL DEFAULT '',
    nation      VARCHAR(150) NOT NULL DEFAULT '',
    clan        VARCHAR(150) NOT NULL DEFAULT '',
    unit        VARCHAR(150) NOT NULL DEFAULT '',
    rules_text  TEXT NOT NULL DEFAULT '',
    image_url   TEXT NOT NULL,
    set_name    VARCHAR(255),
    set_code    VARCHAR(50),
    source_url  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (game, source_id),
    UNIQUE (id, game)
);

CREATE INDEX idx_cards_game_name ON cards (game, lower(name));
CREATE INDEX idx_cards_game_type ON cards (game, type);
CREATE INDEX idx_cards_game_rarity ON cards (game, rarity);

CREATE TABLE decks (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    member_id   BIGINT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    game        VARCHAR(20) NOT NULL
                CHECK (game IN ('vanguard')),
    name        VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) > 0),
    description VARCHAR(1000) NOT NULL DEFAULT '',
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, game)
);

CREATE INDEX idx_decks_member_updated ON decks (member_id, updated_at DESC);
CREATE INDEX idx_decks_public_game ON decks (game, updated_at DESC) WHERE is_public;

-- composite foreign keys บังคับให้การ์ดในเด็คเป็นเกมเดียวกับเด็ค
CREATE TABLE deck_cards (
    deck_id   BIGINT NOT NULL,
    card_id   BIGINT NOT NULL,
    game      VARCHAR(20) NOT NULL,
    quantity  INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (deck_id, card_id),
    FOREIGN KEY (deck_id, game) REFERENCES decks (id, game) ON DELETE CASCADE,
    FOREIGN KEY (card_id, game) REFERENCES cards (id, game) ON DELETE RESTRICT
);

CREATE INDEX idx_deck_cards_card ON deck_cards (card_id);

CREATE TABLE collection_cards (
    member_id  BIGINT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    card_id    BIGINT NOT NULL REFERENCES cards (id) ON DELETE RESTRICT,
    quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (member_id, card_id)
);

CREATE INDEX idx_collection_cards_card ON collection_cards (card_id);

CREATE TABLE reviews (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deck_id    BIGINT NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
    member_id  BIGINT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    content    VARCHAR(1000) NOT NULL CHECK (char_length(btrim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deck_id, member_id)
);

CREATE INDEX idx_reviews_deck_created ON reviews (deck_id, created_at DESC);

-- ให้เข้าฐานข้อมูลผ่าน Go API
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

COMMIT;
