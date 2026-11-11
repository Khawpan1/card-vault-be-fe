-- รองรับ Cardfight!! Vanguard และจำกัดข้อมูลใหม่ให้เป็นเกมเดียว โดยเก็บข้อมูลเดิมไว้
BEGIN;

ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_game_check;
ALTER TABLE cards ADD CONSTRAINT cards_game_check CHECK (game = 'vanguard') NOT VALID;
-- รหัสการ์ด Vanguard จาก PokéWallet ตัวอย่างยาวเกิน 100 ตัวอักษร
ALTER TABLE cards ALTER COLUMN source_id TYPE VARCHAR(150);

ALTER TABLE decks DROP CONSTRAINT IF EXISTS decks_game_check;
ALTER TABLE decks ADD CONSTRAINT decks_game_check CHECK (game = 'vanguard') NOT VALID;

COMMIT;
