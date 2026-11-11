// ดึงการ์ด Vanguard ทีละเซ็ต แล้วสร้าง SQL สำหรับนำเข้า PostgreSQL
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const API = 'https://openapi.tcgtracking.com/v1/16';
const CACHE = new URL('./.make-seed-progress/open-tcg/', import.meta.url);
const OUTPUT = new URL('./seed.sql', import.meta.url);
const limits = { name: 255, type: 255, rarity: 100, setName: 255, setCode: 50 };

async function getJSON(path) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(30000) });
      if (response.ok) return await response.json();
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`HTTP ${response.status} ${path}`, { cause: 'permanent' });
      }
      const retryAfter = response.headers.get('retry-after');
      const delay = Number(retryAfter) * 1000 || Date.parse(retryAfter) - Date.now();
      if (attempt >= 4) throw new Error(`HTTP ${response.status} ${path}`);
      await wait(Math.max(delay || 0, attempt * 2000));
    } catch (error) {
      if (attempt >= 4 || error.cause === 'permanent') throw error;
      await wait(attempt * 2000);
    }
  }
}

async function save(file, content) {
  const temporary = new URL(`${file.href}.tmp`);
  await writeFile(temporary, content, 'utf8');
  await rename(temporary, file);
}

async function readSet(set) {
  const file = new URL(`${set.id}.json`, CACHE);
  let data;
  if (!process.argv.includes('--refresh')) {
    data = await readFile(file, 'utf8').then(JSON.parse).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  const loadedFromCache = Boolean(data);
  if (!loadedFromCache) data = await getJSON(`/sets/${set.id}/cards`);
  if (data.set_id !== set.id || data.product_type !== 'cards'
      || !Array.isArray(data.products) || data.products.length !== data.product_count) {
    throw new Error(`ผลลัพธ์ของเซ็ต ${set.id} ไม่ตรงกับรายการการ์ดที่ API ระบุ`);
  }
  if (!loadedFromCache) await save(file, JSON.stringify(data));
  return data.products;
}

function plainText(value = '') {
  return String(value ?? '')
    .replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi, '\n')
    .replace(/<\/?(?:em|strong|b|i|p|div|span|li|ul|ol)\b[^>]*>/gi, '')
    .replace(/&(amp|nbsp|lt|gt|quot|#39|apos);/g, (_, key) => ({
      amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'",
    })[key])
    .trim();
}

function sql(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replaceAll('\0', '').replace(/[^\S\r\n]+$/gm, '').replaceAll("'", "''")}'`;
}

const { sets } = await getJSON('/sets');
if (!Array.isArray(sets) || !sets.length || sets.some((set) => !Number.isSafeInteger(set.id))) {
  throw new Error('อ่านรายการเซ็ต Vanguard ไม่สำเร็จ');
}
await mkdir(CACHE, { recursive: true });

const cards = new Map();
for (const [index, set] of sets.entries()) {
  for (const product of await readSet(set)) {
    if (!Number.isSafeInteger(product.id) || !product.name?.trim()) {
      throw new Error(`รายการการ์ดในเซ็ต ${set.id} ขาดรหัสหรือชื่อ`);
    }
    // เซ็ตเก่าใช้ Unit/Description ส่วนเซ็ตใหม่ใช้ unit/description
    const info = Object.fromEntries(Object.entries(product.ext_data || {})
      .map(([key, value]) => [key.toLowerCase(), value]));
    const card = {
      sourceId: `tcgtracking:${product.id}`,
      name: product.name.trim(),
      type: [info.unit, info.nation, info.clan].filter(Boolean).join(' · ') || 'ไม่ระบุ',
      rarity: product.rarity || info.raritydbname || 'ไม่ระบุ',
      rulesText: plainText(info.description),
      imageUrl: product.image_url || '',
      setName: set.name || null,
      setCode: set.abbreviation || null,
      sourceUrl: `https://openapi.tcgtracking.com/v1/products/${product.id}`,
    };
    for (const [field, max] of Object.entries(limits)) {
      if (card[field] && [...card[field]].length > max) {
        throw new Error(`การ์ด ${product.id}: ${field} ยาวเกิน ${max} ตัวอักษร`);
      }
    }
    cards.set(product.id, card);
  }
  if ((index + 1) % 25 === 0 || index + 1 === sets.length) {
    console.log(`อ่าน ${index + 1}/${sets.length} เซ็ต · ${cards.size} รายการ`);
  }
}
if (!cards.size) throw new Error('ไม่พบการ์ด Vanguard');

const rows = [...cards.values()];
const lines = ['-- Vanguard จาก Open TCG API (TCGTracking)', 'BEGIN;', 'SET LOCAL standard_conforming_strings = on;'];
for (let offset = 0; offset < rows.length; offset += 500) {
  const values = rows.slice(offset, offset + 500).map((card) => `(${[
    'vanguard', card.sourceId, card.name, card.type, card.rarity,
    card.rulesText, card.imageUrl, card.setName, card.setCode, card.sourceUrl,
  ].map(sql).join(', ')})`);
  lines.push(
    'INSERT INTO public.cards (game, source_id, name, type, rarity, rules_text, image_url, set_name, set_code, source_url) VALUES',
    values.join(',\n'),
    `ON CONFLICT (game, source_id) DO UPDATE SET
      name = EXCLUDED.name, type = EXCLUDED.type, rarity = EXCLUDED.rarity,
      rules_text = EXCLUDED.rules_text, image_url = EXCLUDED.image_url,
      set_name = EXCLUDED.set_name, set_code = EXCLUDED.set_code,
      source_url = EXCLUDED.source_url, updated_at = now();`,
  );
}
lines.push('COMMIT;', '');
await save(OUTPUT, lines.join('\n'));
console.log(JSON.stringify({
  sets: sets.length,
  cards: rows.length,
  withoutRulesText: rows.filter((card) => !card.rulesText).length,
  withoutImage: rows.filter((card) => !card.imageUrl).length,
  withoutType: rows.filter((card) => card.type === 'ไม่ระบุ').length,
  withoutRarity: rows.filter((card) => card.rarity === 'ไม่ระบุ').length,
}));
