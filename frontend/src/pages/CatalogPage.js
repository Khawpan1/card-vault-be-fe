import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';
import CardTile from '../components/CardTile';
import CardFilters from '../components/CardFilters';
import CardPagination from '../components/CardPagination';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function CatalogPage() {
  const [filters, setFilters] = useState({ q: '', setName: '', rarityExact: '' });
  const [cards, setCards] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const latestRequest = useRef(0);

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
  function update(field, value) { setOffset(0); setFilters((current) => ({ ...current, [field]: value })); }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-vault-teal">Cardfight!! Vanguard</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">คลังการ์ด Vanguard</h1><p className="mt-2 text-sm text-vault-muted">ค้นหาตามชื่อ ชุดการ์ด หรือความหายาก · {total.toLocaleString()} ใบ</p></div>
    <section aria-label="ตัวกรองการ์ด" className="mb-8 rounded-2xl border border-vault-line bg-vault-surface p-4 shadow-sm">
      <CardFilters filters={filters} onChange={update}/>
    </section>
    {status === 'loading' && <Loading/>}
    {status === 'error' && <ErrorMessage message={error} onRetry={loadCards}/>}
    {status === 'success' && (cards.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{cards.map((card) => <CardTile key={card.id} card={card}/>)}</div> : <Empty/>)}
    {status === 'success' && <CardPagination total={total} offset={offset} pageSize={24} onChange={setOffset}/>}
  </main>;
}
