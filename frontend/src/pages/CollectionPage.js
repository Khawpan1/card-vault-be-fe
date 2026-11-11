import { useEffect, useState } from 'react';
import { request } from '../api';
import { cardImageUrl, handleCardImageError } from '../cardImage';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function CollectionPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  async function load() {
    setStatus('loading'); setError('');
    try { const data = await request('/me/collection?game=vanguard'); setItems(data.items || []); setStatus('success'); }
    catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { load(); }, []);
  async function changeQuantity(item, quantity) {
    try {
      if (quantity < 1) await request(`/me/collection/${item.id}`, { method: 'DELETE' });
      else await request(`/me/collection/${item.id}`, { method: 'PUT', body: JSON.stringify({ quantity }) });
      await load();
    } catch (err) { setError(err.message); }
  }
  return <main className="mx-auto max-w-7xl px-4 py-8"><p className="text-xs font-bold uppercase tracking-widest text-vault-teal">Cardfight!! Vanguard</p><h1 className="mt-2 text-3xl font-black">คอลเลกชันการ์ดของฉัน</h1>{status === 'loading' && <Loading/>}{status === 'error' && <ErrorMessage message={error} onRetry={load}/ >}{status === 'success' && (items.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[.04]"><img src={cardImageUrl(item)} alt={item.name} loading="lazy" className="aspect-[3/4] w-full object-contain"/><div className="p-3"><p className="truncate font-bold">{item.name}</p><div className="mt-2 flex items-center justify-between"><button onClick={() => changeQuantity(item, item.quantity - 1)} aria-label={`ลดจำนวน ${item.name}`}>−</button><span>{item.quantity} ใบ</span><button onClick={() => changeQuantity(item, item.quantity + 1)} aria-label={`เพิ่มจำนวน ${item.name}`}>+</button></div></div></article>)}</div> : <Empty>ยังไม่มีการ์ดในคอลเลกชัน</Empty>)}</main>;
}
