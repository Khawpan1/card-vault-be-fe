// สร้าง database/seed.sql จาก API ทางการครั้งเดียว แล้วให้เว็บอ่านจาก PostgreSQL
// รันจากรากโปรเจกต์: node --env-file=.env database/make-seed.mjs
// TCGdex ให้ชุดข้อมูล Pokémon ภาษาไทย; ดึงรายละเอียดเฉพาะการ์ดที่ seed ลงฐานข้อมูล
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIMIT_PER_GAME = 500;
const OUTPUT = fileURLToPath(new URL('./seed.sql', import.meta.url));
const SOURCES = {
  yugioh: 'https://db.ygoprodeck.com/api/v7/cardinfo.php',
  mtg: 'https://api.scryfall.com/cards/search',
  pokemon: 'https://api.tcgdex.net/v2/th/cards',
  onepiece: 'https://www.optcgapi.com/api/allSetCards/',
};

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`ข้อมูลการ์ดขาด ${label}`);
  }
  return value.trim();
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  const cleanValue = String(value).replace(/[ \t]+$/gm, '');
  return `'${cleanValue.replaceAll("'", "''")}'`;
}

async function getJSON(url, headers, source) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`${source} ตอบ ${response.status}: ${detail}`);
  }
  return response.json();
}

function pickImage(card) {
  return card.image_uris?.normal
    ?? card.image_uris?.large
    ?? card.card_faces?.[0]?.image_uris?.normal
    ?? card.card_faces?.[0]?.image_uris?.large
    ?? null;
}

function mapYugioh(card) {
  const image = card.card_images?.find((item) => item.image_url)?.image_url;
  const rarity = card.card_sets?.find((item) => item.set_rarity)?.set_rarity;
  if (!card.id || !card.name || !card.type || !rarity || !card.desc || !image) return null;
  const set = card.card_sets?.find((item) => item.set_rarity && item.set_name);
  return {
    game: 'yugioh', sourceId: String(card.id), name: card.name,
    type: card.type, rarity, rulesText: card.desc, imageUrl: image,
    setName: set?.set_name ?? null, setCode: set?.set_code ?? null,
    sourceUrl: card.ygoprodeck_url ?? SOURCES.yugioh,
  };
}

async function seedYugioh() {
  const body = await getJSON(SOURCES.yugioh, { Accept: 'application/json' }, 'YGOPRODeck');
  const completeCards = (body.data ?? []).map(mapYugioh).filter(Boolean);
  if (completeCards.length < LIMIT_PER_GAME) {
    throw new Error(`YGOPRODeck ให้ข้อมูลครบเพียง ${completeCards.length}/${LIMIT_PER_GAME} ใบ`);
  }
  return completeCards.slice(0, LIMIT_PER_GAME);
}

async function collectPages({ source, headers, params, mapCard, label }) {
  const cards = [];
  for (let page = 1; cards.length < LIMIT_PER_GAME; page += 1) {
    const url = new URL(source);
    for (const [key, value] of Object.entries({ ...params, page })) {
      url.searchParams.set(key, String(value));
    }
    const body = await getJSON(url, headers, label);
    for (const raw of body.data ?? []) {
      const mapped = mapCard(raw);
      if (mapped) cards.push(mapped);
      if (cards.length === LIMIT_PER_GAME) break;
    }
    // Scryfall ใช้ has_more ส่วน Pokémon TCG ใช้ totalCount
    const hasNextPage = body.has_more
      ?? (Number.isFinite(body.totalCount) && body.totalCount > page * Number(params.pageSize ?? 0));
    if (!hasNextPage || !(body.data ?? []).length) break;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  if (cards.length < LIMIT_PER_GAME) {
    throw new Error(`${label} ให้ข้อมูลที่ครบไม่ถึง ${LIMIT_PER_GAME} ใบ (ได้ ${cards.length})`);
  }
  return cards.slice(0, LIMIT_PER_GAME);
}

function mapMtg(card) {
  const image = pickImage(card);
  const faces = card.card_faces ?? [];
  const rulesText = card.oracle_text
    ?? faces.map((face) => face.oracle_text).filter(Boolean).join('\n\n');
  if (!card.id || !card.name || !card.type_line || !card.rarity || !rulesText || !image) return null;
  return {
    game: 'mtg', sourceId: card.id, name: card.name, type: card.type_line,
    rarity: card.rarity, rulesText, imageUrl: image,
    setName: card.set_name ?? null, setCode: card.set ?? null,
    sourceUrl: card.scryfall_uri ?? card.uri,
  };
}

function mapPokemon(card) {
  const typeParts = [card.category, ...(card.types ?? []), card.stage].filter(Boolean);
  const rules = [
    ...(card.abilities ?? []).map((item) => [item.name, item.effect].filter(Boolean).join(': ')),
    ...(card.attacks ?? []).map((item) => [item.name, item.effect].filter(Boolean).join(': ')),
    card.effect,
    card.description,
  ].filter(Boolean);
  const rulesText = rules.join('\n');
  if (!card.id || !card.name || !typeParts.length || !card.rarity || !rulesText || !card.image) return null;
  return {
    game: 'pokemon', sourceId: card.id, name: card.name,
    type: typeParts.join(' '), rarity: card.rarity, rulesText,
    // TCGdex ส่ง base URL; เติมขนาด/นามสกุลตามรูปแบบ asset ของ API
    imageUrl: `${card.image}/low.webp`, setName: card.set?.name ?? null,
    setCode: card.set?.id ?? null,
    sourceUrl: `https://api.tcgdex.net/v2/th/cards/${encodeURIComponent(card.id)}`,
  };
}

async function seedPokemon() {
  const briefs = await getJSON(SOURCES.pokemon, { Accept: 'application/json' }, 'TCGdex Thai');
  const cards = [];
  for (let index = 0; index < briefs.length && cards.length < LIMIT_PER_GAME; index += 5) {
    const batch = briefs.slice(index, index + 5);
    const details = await Promise.all(batch.map((brief) => getJSON(
      `${SOURCES.pokemon}/${encodeURIComponent(brief.id)}`,
      { Accept: 'application/json' },
      'TCGdex Thai',
    )));
    cards.push(...details.map(mapPokemon).filter(Boolean));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (cards.length < LIMIT_PER_GAME) {
    throw new Error(`TCGdex Thai ให้ข้อมูลที่ครบเพียง ${cards.length}/${LIMIT_PER_GAME} ใบ`);
  }
  return cards.slice(0, LIMIT_PER_GAME);
}

function mapOnePiece(card) {
  const type = card.card_type;
  const name = card.card_name;
  const image = card.card_image;
  const rulesText = card.card_text;
  const rarity = card.rarity;
  if (!name || !type || !rarity || !rulesText || !image || !card.card_set_id) return null;
  return {
    game: 'onepiece',
    sourceId: `${card.set_id ?? 'set'}:${card.card_image_id ?? card.card_set_id}`,
    name,
    type,
    rarity,
    rulesText,
    imageUrl: image,
    setName: card.set_name ?? null,
    setCode: card.set_id ?? null,
    sourceUrl: `https://www.optcgapi.com/api/sets/card/${encodeURIComponent(card.card_set_id)}/`,
  };
}

function insertStatement(card) {
  const values = [
    card.game, card.sourceId, card.name, card.type, card.rarity,
    card.rulesText, card.imageUrl, card.setName, card.setCode, card.sourceUrl,
  ].map(sql).join(', ');
  return `  (${values})`;
}

const headers = {
  mtg: {
    Accept: 'application/json',
    'User-Agent': 'BEFE-Card-Deck-Seed/1.0 (one-time local seed)',
  },
};

const yugioh = await seedYugioh();
const mtg = await collectPages({
  source: SOURCES.mtg,
  headers: headers.mtg,
  params: { q: 'game:paper', unique: 'cards', order: 'name' },
  mapCard: mapMtg,
  label: 'Scryfall',
});
const pokemon = await seedPokemon();
const onePieceResponse = await getJSON(SOURCES.onepiece, { Accept: 'application/json' }, 'One Piece TCG API');
const onePiece = [...new Map(
  (Array.isArray(onePieceResponse) ? onePieceResponse : onePieceResponse.data ?? [])
    .map(mapOnePiece)
    .filter(Boolean)
    .map((card) => [card.sourceId, card]),
).values()];
if (!onePiece.length) throw new Error('One Piece TCG API ไม่มีข้อมูลการ์ดที่ครบตามฟิลด์ที่ต้องใช้');

const allCards = [...yugioh, ...mtg, ...pokemon, ...onePiece];
if (allCards.length !== LIMIT_PER_GAME * 3 + onePiece.length) {
  throw new Error('จำนวนการ์ดที่เตรียมไม่ตรงกับที่กำหนด');
}

const lines = [
  '-- สร้างโดย database/make-seed.mjs; แก้ข้อมูลซ้ำได้ด้วยการรันสคริปต์ใหม่',
  '-- Image URLs remain hosted by each provider as requested; no image files are downloaded.',
  '-- Pokémon card data uses TCGdex Thai; no API key is required.',
  '-- One Piece card data is provided by OPTCG API; image URLs remain hosted by the source.',
  '',
  'BEGIN;',
  '',
  'INSERT INTO cards (game, source_id, name, type, rarity, rules_text, image_url, set_name, set_code, source_url)',
  'VALUES',
  allCards.map(insertStatement).join(',\n'),
  'ON CONFLICT (game, source_id) DO UPDATE SET',
  '  name = EXCLUDED.name,',
  '  type = EXCLUDED.type,',
  '  rarity = EXCLUDED.rarity,',
  '  rules_text = EXCLUDED.rules_text,',
  '  image_url = EXCLUDED.image_url,',
  '  set_name = EXCLUDED.set_name,',
  '  set_code = EXCLUDED.set_code,',
  '  source_url = EXCLUDED.source_url,',
  '  updated_at = now();',
  '',
  'COMMIT;',
  '',
];

writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`เขียน ${OUTPUT}: Yu-Gi-Oh! ${yugioh.length} + MTG ${mtg.length} + Pokémon ${pokemon.length} + One Piece ${onePiece.length} ใบ`);
