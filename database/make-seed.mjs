// สร้าง database/seed.sql จาก API ทางการครั้งเดียว แล้วให้เว็บอ่านจาก PostgreSQL
// รันจากรากโปรเจกต์: node --env-file=.env database/make-seed.mjs
// Pokémon TCG API รับ request ที่ไม่มี key ได้ แต่จำกัด rate ต่ำกว่า
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIMIT_PER_GAME = 40;
const OUTPUT = fileURLToPath(new URL('./seed.sql', import.meta.url));
const SOURCES = {
  yugioh: 'https://db.ygoprodeck.com/api/v7/cardinfo.php',
  mtg: 'https://api.scryfall.com/cards/search',
  pokemon: 'https://api.pokemontcg.io/v2/cards',
};

// ชื่อที่ใช้ค้น Yu-Gi-Oh! เป็นชื่อ exact ตามพารามิเตอร์ name ของ v7
const YUGIOH_NAMES = [
  'Blue-Eyes White Dragon', 'Dark Magician', 'Dark Magician Girl',
  'Red-Eyes Black Dragon', 'Summoned Skull', 'Jinzo',
  'Exodia the Forbidden One', 'Right Arm of the Forbidden One',
  'Left Arm of the Forbidden One', 'Right Leg of the Forbidden One',
  'Left Leg of the Forbidden One', 'Kuriboh', 'Celtic Guardian',
  'Gaia The Fierce Knight', 'Baby Dragon', 'Time Wizard', 'Thousand Dragon',
  'Harpie Lady', "Harpie's Feather Duster", 'Mirror Force', 'Monster Reborn',
  'Pot of Greed', 'Polymerization', 'Raigeki', 'Dark Hole', 'Change of Heart',
  'Mystical Space Typhoon', 'Book of Moon', 'Blue-Eyes Ultimate Dragon',
  'Red-Eyes Black Metal Dragon', 'Black Luster Soldier - Envoy of the Beginning',
  'Chaos Emperor Dragon - Envoy of the End', 'Cyber Dragon', 'Cyber End Dragon',
  'Stardust Dragon', 'Black Rose Dragon', 'Number 39: Utopia', 'Decode Talker',
  'Accesscode Talker', 'Ash Blossom & Joyous Spring',
  'Blue-Eyes Alternative White Dragon', 'Dark Magician of Chaos',
  'Elemental HERO Neos', 'Cyberse Magician', 'Borreload Dragon',
];

function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`ข้อมูลการ์ดขาด ${label}`);
  }
  return value.trim();
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
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
  const url = new URL(SOURCES.yugioh);
  url.searchParams.set('name', YUGIOH_NAMES.join('|'));
  const body = await getJSON(url, { Accept: 'application/json' }, 'YGOPRODeck');
  const byName = new Map((body.data ?? []).map((card) => [card.name, card]));
  const missingNames = YUGIOH_NAMES.filter((name) => !byName.has(name));
  if (missingNames.length) {
    throw new Error(`YGOPRODeck ไม่พบชื่อการ์ด: ${missingNames.join(', ')}`);
  }
  const completeCards = YUGIOH_NAMES.map((name) => mapYugioh(byName.get(name))).filter(Boolean);
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
  const typeParts = [card.supertype, ...(card.subtypes ?? [])].filter(Boolean);
  if (card.types?.length) typeParts.push(`(${card.types.join('/')})`);
  const rules = [
    ...(card.rules ?? []),
    ...(card.abilities ?? []).map((item) => [item.name, item.text].filter(Boolean).join(': ')),
    ...(card.attacks ?? []).map((item) => [item.name, item.text].filter(Boolean).join(': ')),
  ].filter(Boolean);
  const rulesText = rules.join('\n');
  if (!card.id || !card.name || !typeParts.length || !card.rarity || !rulesText || !card.images?.large) return null;
  return {
    game: 'pokemon', sourceId: card.id, name: card.name,
    type: typeParts.join(' '), rarity: card.rarity, rulesText,
    imageUrl: card.images.large, setName: card.set?.name ?? null,
    setCode: card.set?.id ?? null, sourceUrl: 'https://pokemontcg.io/',
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
  pokemon: {
    Accept: 'application/json',
    ...(process.env.POKEMON_TCG_API_KEY
      ? { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY }
      : {}),
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
const pokemon = await collectPages({
  source: SOURCES.pokemon,
  headers: headers.pokemon,
  params: {
    pageSize: 100,
    orderBy: 'name',
  },
  mapCard: mapPokemon,
  label: 'Pokémon TCG API',
});

const allCards = [...yugioh, ...mtg, ...pokemon];
if (allCards.length !== LIMIT_PER_GAME * 3) {
  throw new Error(`คาดไว้ ${LIMIT_PER_GAME * 3} ใบ แต่เตรียมได้ ${allCards.length} ใบ`);
}

const lines = [
  '-- สร้างโดย database/make-seed.mjs; แก้ข้อมูลซ้ำได้ด้วยการรันสคริปต์ใหม่',
  '-- Image URLs remain hosted by each provider as requested; no image files are downloaded.',
  '-- Pokémon TCG API is deprecated; unauthenticated requests have lower rate limits.',
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
console.log(`เขียน ${OUTPUT}: Yu-Gi-Oh! ${yugioh.length} + MTG ${mtg.length} + Pokémon ${pokemon.length} ใบ`);
