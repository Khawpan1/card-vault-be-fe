import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { request } from '../api';
import { ErrorMessage, Loading } from '../components/LoadState';
import { useAuth } from '../auth/AuthContext';
import { cardImageUrl, handleCardImageError } from '../cardImage';

export default function CardPage() {
  const { cardId } = useParams();
  const { member } = useAuth();
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  async function loadCard() {
    setStatus('loading');
    try { const data = await request(`/cards/${cardId}`); setCard(data.card); setStatus('success'); }
    catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { loadCard(); }, [cardId]);
  async function addToCollection() {
    setError(''); setSaved('');
    try {
      const data = await request(`/me/collection?game=${card.game}`);
      const owned = data.items.find((item) => item.id === card.id)?.quantity || 0;
      await request(`/me/collection/${card.id}`, { method: 'PUT', body: JSON.stringify({ quantity: owned + 1 }) });
      setSaved('เพิ่มลงคอลเลกชันแล้ว');
    } catch (err) { setError(err.message); }
  }
  if (status === 'loading') return <Loading/>;
  if (status === 'error') return <main className="mx-auto max-w-5xl px-4"><ErrorMessage message={error} onRetry={loadCard}/></main>;
  return <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
    <img src={cardImageUrl(card)} onError={handleCardImageError} alt={card.name} className="mx-auto max-h-[75vh] rounded-xl object-contain"/>
    <section><p className="text-sm font-bold uppercase text-vault-teal">Cardfight!! Vanguard · {card.setCode}</p><h1 className="mt-2 text-3xl font-black">{card.name}</h1><p className="mt-5 text-vault-gold">{card.rarity}</p><p className="mt-2 text-vault-muted">{card.type}</p><p className="mt-6 whitespace-pre-line leading-7">{card.rulesText}</p>{member && <button onClick={addToCollection} className="mt-6 rounded bg-vault-orange px-4 py-2 font-bold text-white hover:bg-vault-orange-hover">เก็บการ์ดใบนี้</button>}{saved && <p role="status" className="mt-3 text-vault-teal">{saved}</p>}{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}<a href={card.sourceUrl} target="_blank" rel="noreferrer" className="mt-8 block text-sm text-vault-teal underline">ดูแหล่งข้อมูลการ์ด</a></section>
  </main>;
}
