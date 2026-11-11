// สร้าง database/seed.sql จาก PokéWallet เพียงครั้งเดียว (ไม่เรียก API จากหน้าเว็บ)
// ต้องตั้ง POKEWALLET_API_KEY ใน environment ก่อนรัน
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.pokewallet.io/cfv';
const SOURCE_URL = 'https://pokewallet.io/api-docs/cardfight-vanguard';
const OUTPUT = fileURLToPath(new URL('./seed.sql', import.meta.url));
const PROGRESS_DIR = fileURLToPath(new URL('./.make-seed-progress/', import.meta.url));
const PROGRESS = fileURLToPath(new URL('./.make-seed-progress/state.json', import.meta.url));
const API_KEY = process.env.POKEWALLET_API_KEY;
const PAGE_SIZE = 200;
const CARD_LIMIT = process.argv.includes('--all') ? Infinity : Number(process.env.SEED_CARD_LIMIT || 40);
if (CARD_LIMIT !== Infinity && (!Number.isInteger(CARD_LIMIT) || CARD_LIMIT < 1)) {
  throw new Error('SEED_CARD_LIMIT ต้องเป็นจำนวนเต็มมากกว่า 0');
}
const MIN_REQUEST_INTERVAL_MS = 36000; // Free plan: max 100 calls per hour.

if (!API_KEY) throw new Error('กรุณาตั้ง POKEWALLET_API_KEY ใน environment ก่อนรัน seed');

let lastRequestAt = 0;

async function getJSON(path) {
  const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const response = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/json', 'X-API-Key': API_KEY },
  });
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after'));
    const limitInfo = await response.json().catch(() => ({}));
    const dailyLimit = limitInfo.message?.toLowerCase().includes('daily')
      || limitInfo.limits?.daily?.remaining === 0;
    const waitSeconds = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter
      : (dailyLimit ? 86400 : 3600);
    throw new Error(`PokéWallet ถึง rate limit แล้ว; รอประมาณ ${Math.ceil(waitSeconds / 60)} นาทีแล้วรันใหม่ สคริปต์จะทำต่อจากชุดเดิม`);
  }
  if (!response.ok) {
    throw new Error(`PokéWallet ตอบ ${response.status}; หยุดเพื่อไม่ให้เขียน seed ที่ไม่ครบ`);
  }
  return response.json();
}

function saveProgress(progress) {
  mkdirSync(PROGRESS_DIR, { recursive: true });
  const temporary = `${PROGRESS}.tmp`;
  writeFileSync(temporary, JSON.stringify(progress), 'utf8');
  renameSync(temporary, PROGRESS);
}

function saveSetCards(index, cards) {
  mkdirSync(PROGRESS_DIR, { recursive: true });
  const filename = fileURLToPath(new URL(`./.make-seed-progress/${String(index).padStart(4, '0')}.json`, import.meta.url));
  const temporary = `${filename}.tmp`;
  writeFileSync(temporary, JSON.stringify(cards), 'utf8');
  renameSync(temporary, filename);
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/[ \t]+$/gm, '').replaceAll("'", "''")}'`;
}

function plainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .trim();
}

let progress = existsSync(PROGRESS)
  ? JSON.parse(readFileSync(PROGRESS, 'utf8'))
  : { sets: null, setIndex: 0, page: 1, skipped: 0 };

if (!progress.sets) {
  const setsResponse = await getJSON('/sets');
  progress.sets = (setsResponse.data || [])
    .filter((set) => set.set_id)
    .sort((left, right) => String(left.set_id).localeCompare(String(right.set_id)));
  saveProgress(progress);
}

const cardsById = new Map();
for (let index = 0; index < progress.setIndex; index += 1) {
  const filename = fileURLToPath(new URL(`./.make-seed-progress/${String(index).padStart(4, '0')}.json`, import.meta.url));
  if (!existsSync(filename)) {
    throw new Error(`ไม่พบ checkpoint ของชุดที่ ${index + 1}; อย่าลบโฟลเดอร์ database/.make-seed-progress`);
  }
  for (const card of JSON.parse(readFileSync(filename, 'utf8'))) cardsById.set(card.sourceId, card);
}

let currentSetCards = new Map();
while (progress.setIndex < progress.sets.length && cardsById.size < CARD_LIMIT) {
  const set = progress.sets[progress.setIndex];
  const detail = await getJSON(`/sets/${encodeURIComponent(set.set_id)}?page=${progress.page}&limit=${PAGE_SIZE}`);
  for (const card of detail.cards || []) {
    const info = card.card_info || {};
    // รวมการ์ดจริงทุกใบจากทุกชุด ไม่รวม sealed products
    if (!card.id || info.product_type !== 'card' || !info.name) {
      progress.skipped += 1;
      continue;
    }
    const type = [info.card_type, info.unit, info.nation, info.clan].filter(Boolean).join(' · ');
    currentSetCards.set(card.id, {
      sourceId: card.id,
      name: info.name,
      type: type || 'ไม่ระบุ',
      rarity: info.rarity || 'ไม่ระบุ',
      rulesText: plainText(info.card_text || info.flavor_text) || '',
      imageUrl: `${API}/images/${encodeURIComponent(card.id)}`,
      setName: info.set_name || detail.set?.name || set.name,
      setCode: info.set_code || detail.set?.set_code || set.set_code,
      sourceUrl: SOURCE_URL,
    });
  }

  const totalPages = Number(detail.pagination?.total_pages || 1);
  if (progress.page >= totalPages) {
    saveSetCards(progress.setIndex, [...currentSetCards.values()]);
    for (const card of currentSetCards.values()) cardsById.set(card.sourceId, card);
    currentSetCards = new Map();
    progress.setIndex += 1;
    progress.page = 1;
    // บันทึกทีละชุด ลดการเขียนไฟล์ใหญ่ซ้ำทุกหน้า
    saveProgress(progress);
  } else {
    progress.page += 1;
  }

  if (progress.setIndex % 10 === 0 && progress.page === 1) {
    console.log(`ดึงแล้ว ${progress.setIndex}/${progress.sets.length} ชุด · การ์ด ${cardsById.size} ใบ`);
  }
}

const cards = [...cardsById.values()].slice(0, CARD_LIMIT);
if (!cards.length) throw new Error('ไม่พบการ์ด Vanguard ที่นำเข้าได้; ไม่เขียนทับ seed.sql');

const values = cards.map((card) => `  (${[
  'vanguard', card.sourceId, card.name, card.type, card.rarity,
  card.rulesText, card.imageUrl, card.setName, card.setCode, card.sourceUrl,
].map(sql).join(', ')})`);

const lines = [
  '-- สร้างโดย database/make-seed.mjs; รันสคริปต์ใหม่เพื่ออัปเดตข้อมูลจาก PokéWallet',
  '-- ไม่ดาวน์โหลดไฟล์ภาพ; เว็บขอรูปผ่าน Backend ที่ซ่อน API key และ cache 24 ชั่วโมง',
  `-- ชุดข้อมูล: ${Number.isFinite(CARD_LIMIT) ? `ตัวอย่าง Vanguard ${cards.length} ใบ` : `Vanguard ทั้ง ${progress.sets.length} ชุด`}; ข้ามรายการที่ไม่ใช่การ์ดหรือไม่มีชื่อ ${progress.skipped} รายการ`,
  '',
  'BEGIN;',
  'INSERT INTO cards (game, source_id, name, type, rarity, rules_text, image_url, set_name, set_code, source_url)',
  'VALUES',
  values.join(',\n'),
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
  'COMMIT;',
  '',
];

writeFileSync(OUTPUT, lines.join('\n'), 'utf8');
console.log(`เขียน ${OUTPUT}: การ์ดไม่ซ้ำ ${cards.length} ใบ จาก ${progress.sets.length} ชุด; ข้าม ${progress.skipped} รายการ`);
