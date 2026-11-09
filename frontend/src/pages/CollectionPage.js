import { useEffect, useState } from 'react';
import { request } from '../api';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function CollectionPage() {
  const [game, setGame] = useState('');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  async function load() {
    setStatus('loading'); setError('');
    try { const query = game ? `?game=${game}` : ''; const data = await request(`/me/collection${query}`); setItems(data.items || []); setStatus('success'); }
    catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { load(); }, [game]);
  async function changeQuantity(item, quantity) {
    try {
      if (quantity < 1) await request(`/me/collection/${item.id}`, { method: 'DELETE' });
      else await request(`/me/collection/${item.id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      await load();
    } catch (err) { setError(err.message); }
  }
  return <main className="mx-auto max-w-7xl px-4 py-8"><h1 className="text-3xl font-black">คอลเลกชันของฉัน</h1><label className="mt-5 inline-flex items-center gap-3 text-sm">กรองเกม<select value={game} onChange={(e) => setGame(e.target.value)} className="rounded border border-white/10 bg-vault-background p-2"><option value="">ทุกเกม</option><option value="yugioh">Yu-Gi-Oh!</option><option value="mtg">Magic: The Gathering</option><option value="pokemon">Pokémon TCG</option></select></label>{status === 'loading' && <Loading/>}{status === 'error' && <ErrorMessage message={error} onRetry={load}/ >}{status === 'success' && (items.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.04]"><img src={item.imageUrl} alt={item.name} className="aspect-[3/4] w-full object-contain"/><div className="p-3"><p className="truncate font-bold">{item.name}</p><div className="mt-2 flex items-center justify-between"><button onClick={() => changeQuantity(item, item.quantity - 1)} aria-label={`ลดจำนวน ${item.name}`}>−</button><span>{item.quantity} ใบ</span><button onClick={() => changeQuantity(item, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}>+</button></div></div></article>)}</div> : <Empty>ยังไม่มีการ์ดในคอลเลกชัน</Empty>)}</main>;
}
