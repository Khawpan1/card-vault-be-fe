-- อนุญาตให้การ์ดและเด็คใช้เกม One Piece ในฐานข้อมูลเดิม
BEGIN;

ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_game_check;
ALTER TABLE cards ADD CONSTRAINT cards_game_check
    CHECK (game IN ('yugioh', 'mtg', 'pokemon', 'onepiece'));

ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_game_check;
ALTER TABLE decks ADD CONSTRAINT decks_game_check
    CHECK (game IN ('yugioh', 'mtg', 'pokemon', 'onepiece'));

COMMIT;
