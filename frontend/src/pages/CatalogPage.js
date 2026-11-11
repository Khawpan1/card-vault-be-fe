import { useEffect, useRef, useState } from 'react';
import { request } from '../api';
import CardTile from '../components/CardTile';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function CatalogPage() {
  const [filters, setFilters] = useState({ q: '', type: '', rarity: '' });
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const latestRequest = useRef(0);
  const query = new URLSearchParams({ game: 'vanguard', ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
  query.set('limit', '24');
  query.set('offset', String(offset));

  async function loadCards() {
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
  }
  useEffect(() => { loadCards(); /* filters and page trigger a new local API request */ }, [filters.q, filters.type, filters.rarity, offset]);
  function update(field, value) { setOffset(0); setFilters((current) => ({ ...current, [field]: value })); }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-vault-teal">Cardfight!! Vanguard</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">คลังการ์ด Vanguard</h1><p className="mt-2 text-sm text-vault-cream/60">ค้นหาและกรองข้อมูลที่จัดเก็บในฐานข้อมูลของเรา · {total.toLocaleString()} ใบ</p></div>
    <section aria-label="ตัวกรองการ์ด" className="mb-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:grid-cols-3">
      <input aria-label="ค้นหาชื่อการ์ด" value={filters.q} onChange={(e) => update('q', e.target.value)} placeholder="ค้นหาชื่อการ์ด…" className="min-w-0 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3"/>
      <input aria-label="ประเภท" value={filters.type} onChange={(e) => update('type', e.target.value)} placeholder="ประเภทการ์ด" className="min-w-0 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3"/>
      <input aria-label="ความหายาก" value={filters.rarity} onChange={(e) => update('rarity', e.target.value)} placeholder="ความหายาก" className="min-w-0 rounded-xl border border-white/10 bg-white/[.05] px-4 py-3"/>
    </section>
    {status === 'loading' && <Loading/>}
    {status === 'error' && <ErrorMessage message={error} onRetry={loadCards}/>}
    {status === 'success' && (cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{cards.map((card) => <CardTile key={card.id} card={card}/>)}</div> : <Empty/>)}
    {status === 'success' && total > 24 && <nav aria-label="เปลี่ยนหน้ารายการการ์ด" className="mt-8 flex items-center justify-center gap-4"><button disabled={offset===0} onClick={() => setOffset(Math.max(0,offset-24))} className="rounded border border-white/20 px-4 py-2 disabled:opacity-30">ก่อนหน้า</button><span className="text-sm text-vault-cream/60">หน้า {Math.floor(offset/24)+1} / {Math.ceil(total/24)}</span><button disabled={offset+cards.length>=total} onClick={() => setOffset(offset+24)} className="rounded border border-white/20 px-4 py-2 disabled:opacity-30">ถัดไป</button></nav>}
    <p className="mt-8 text-center text-xs text-vault-cream/40">ข้อมูลการ์ดจาก PokéWallet Cardfight!! Vanguard API</p>
  </main>;
}
