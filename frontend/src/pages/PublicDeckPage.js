import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function PublicDeckPage() {
  const { deckId } = useParams();
  const { member } = useAuth();
  const [deck, setDeck] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  async function load() {
    setStatus('loading'); setError('');
    try { const [deckData, reviewData] = await Promise.all([request(`/decks/${deckId}`), request(`/decks/${deckId}/reviews`)]); setDeck(deckData.deck); setReviews(reviewData.items || []); setStatus('success'); }
    catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { load(); }, [deckId]);
  async function submitReview(event) {
    event.preventDefault(); setError('');
    try { await request(`/decks/${deckId}/reviews`, { method: 'POST', body: JSON.stringify({ content }) }); setContent(''); await load(); }
    catch (err) { setError(err.message); }
  }
  if (status === 'loading') return <Loading/>;
  if (status === 'error') return <main className="mx-auto max-w-5xl px-4"><ErrorMessage message={error} onRetry={load}/></main>;
  return <main className="mx-auto max-w-5xl px-4 py-10"><p className="text-xs uppercase tracking-widest text-vault-teal">Public deck · {deck.game}</p><h1 className="mt-2 text-3xl font-black">{deck.name}</h1><p className="mt-2 text-vault-cream/60">โดย {deck.memberName}</p><p className="mt-4 whitespace-pre-line">{deck.description}</p><h2 className="mt-8 text-xl font-bold">การ์ดในเด็ค ({deck.cards?.length || 0} รายการ)</h2>{deck.cards?.length ? <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{deck.cards.map((card) => <article key={card.id} className="overflow-hidden rounded-lg border border-black/10"><img src={card.imageUrl} alt={card.name} className="aspect-[3/4] w-full object-contain"/><p className="p-2 text-sm font-bold">{card.name} × {card.quantity}</p></article>)}</div> : <Empty>เด็คนี้ยังไม่มีการ์ด</Empty>}<section className="mt-10"><h2 className="text-xl font-bold">รีวิว</h2>{member && <form onSubmit={submitReview} className="mt-4"><textarea required maxLength="1000" value={content} onChange={(e) => setContent(e.target.value)} placeholder="เขียนรีวิวสั้น ๆ" className="w-full rounded border border-black/10 bg-black/20 p-3"/><button className="mt-2 rounded bg-vault-gold px-4 py-2 font-bold text-vault-background">ส่งรีวิว</button></form>}<div className="mt-4 space-y-3">{reviews.length ? reviews.map((review) => <article key={review.id} className="rounded border border-black/10 p-4"><p className="text-sm text-vault-teal">{review.memberName}</p><p className="mt-2 whitespace-pre-line">{review.content}</p></article>) : <Empty>ยังไม่มีรีวิว</Empty>}</div></section>{error && <p role="alert" className="mt-3 text-red-700">{error}</p>}</main>;
}
