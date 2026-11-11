import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';
import CardTile from '../components/CardTile';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function CatalogPage() {
  const [filters, setFilters] = useState({ q: '', setName: '', rarityExact: '' });
  const [options, setOptions] = useState({ sets: [], rarities: [] });
  const [optionsStatus, setOptionsStatus] = useState('loading');
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const latestRequest = useRef(0);

  const loadFilterOptions = useCallback(async () => {
    setOptionsStatus('loading');
    try {
      const data = await request('/cards/filters');
      setOptions({ sets: data.sets || [], rarities: data.rarities || [] });
      setOptionsStatus('success');
    } catch {
      setOptionsStatus('error');
    }
  }, []);

  const loadCards = useCallback(async () => {
    const query = new URLSearchParams({ game: 'vanguard', limit: '24', offset: String(offset) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    const requestId = ++latestRequest.current;
    setStatus('loading'); setError('');
    try {
      const data = await request(`/cards?${query.toString()}`);
      if (requestId !== latestRequest.current) return;
      setCards(data.items || []); setTotal(data.total || 0); setStatus('success');
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err.message); setStatus('error');
    }
  }, [filters, offset]);

  useEffect(() => { loadCards(); }, [loadCards]);
  useEffect(() => { loadFilterOptions(); }, [loadFilterOptions]);
  function update(field, value) { setOffset(0); setFilters((current) => ({ ...current, [field]: value })); }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-vault-teal">Cardfight!! Vanguard</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">คลังการ์ด Vanguard</h1><p className="mt-2 text-sm text-vault-muted">ค้นหาตามชื่อ ชุดการ์ด หรือความหายาก · {total.toLocaleString()} ใบ</p></div>
    <section aria-label="ตัวกรองการ์ด" className="mb-8 rounded-2xl border border-vault-line bg-vault-surface p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          ค้นหาชื่อการ์ด
          <input value={filters.q} onChange={(e) => update('q', e.target.value)} placeholder="ค้นหาชื่อการ์ด…" className="min-w-0 rounded-xl border border-vault-control bg-vault-surface px-4 py-3 font-normal"/>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          ชุดการ์ด
          <select value={filters.setName} onChange={(e) => update('setName', e.target.value)} disabled={optionsStatus !== 'success'} className="min-w-0 w-full rounded-xl border border-vault-control bg-vault-surface px-4 py-3 font-normal disabled:opacity-60">
            <option value="">{optionsStatus === 'loading' ? 'กำลังโหลดชุดการ์ด…' : 'ทุกชุด'}</option>
            {options.sets.map((set) => <option key={set} value={set}>{set}</option>)}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          ความหายาก
          <select value={filters.rarityExact} onChange={(e) => update('rarityExact', e.target.value)} disabled={optionsStatus !== 'success'} className="min-w-0 w-full rounded-xl border border-vault-control bg-vault-surface px-4 py-3 font-normal disabled:opacity-60">
            <option value="">{optionsStatus === 'loading' ? 'กำลังโหลดความหายาก…' : 'ทุกความหายาก'}</option>
            {options.rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
          </select>
        </label>
      </div>
      {optionsStatus === 'error' && <p role="alert" className="mt-3 text-sm text-red-700">
        โหลดตัวเลือกชุดการ์ดและความหายากไม่สำเร็จ <button type="button" onClick={loadFilterOptions} className="ml-2 underline">โหลดตัวกรองอีกครั้ง</button>
      </p>}
    </section>
    {status === 'loading' && <Loading/>}
    {status === 'error' && <ErrorMessage message={error} onRetry={loadCards}/>}
    {status === 'success' && (cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{cards.map((card) => <CardTile key={card.id} card={card}/>)}</div> : <Empty/>)}
    {status === 'success' && total > 24 && <nav aria-label="เปลี่ยนหน้ารายการการ์ด" className="mt-8 flex items-center justify-center gap-4"><button disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-24))} className="rounded-lg border border-vault-line bg-vault-surface px-4 py-2 hover:bg-vault-inset disabled:opacity-50">ก่อนหน้า</button><span className="text-sm text-vault-muted">หน้า {Math.floor(offset/24)+1} / {Math.ceil(total/24)}</span><button disabled={offset+cards.length>=total} onClick={() => setOffset(offset+24)} className="rounded-lg border border-vault-line bg-vault-surface px-4 py-2 hover:bg-vault-inset disabled:opacity-50">ถัดไป</button></nav>}
  </main>;
}
