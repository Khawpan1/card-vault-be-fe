import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../auth/AuthContext';
import CardTile from '../components/CardTile';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

const gameNames = { yugioh: 'Yu-Gi-Oh!', mtg: 'Magic: The Gathering', pokemon: 'Pokémon TCG' };

function DeckEditor({ deck, onClose, onSaved }) {
  const [form, setForm] = useState({ game: deck?.game || 'yugioh', name: deck?.name || '', description: deck?.description || '', isPublic: deck?.isPublic || false });
  const [cards, setCards] = useState(deck?.cards || []);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('idle');
  const [deckLoading, setDeckLoading] = useState(Boolean(deck?.id));
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deck?.id) { setCards([]); setDeckLoading(false); return; }
    let active = true;
    setDeckLoading(true);
    request(`/decks/${deck.id}`).then((data) => { if (active) setCards(data.deck.cards || []); }).catch((err) => setError(err.message)).finally(() => { if (active) setDeckLoading(false); });
    return () => { active = false; };
  }, [deck?.id]);
  useEffect(() => {
    if (!search.trim()) { setResults([]); setSearchStatus('idle'); return; }
    let active = true;
    setSearchStatus('loading');
    request(`/cards?game=${form.game}&q=${encodeURIComponent(search)}&limit=8`).then((data) => { if (active) { setResults(data.items || []); setSearchStatus('success'); } }).catch((err) => { if (active) { setError(err.message); setSearchStatus('error'); } });
    return () => { active = false; };
  }, [form.game, search]);
  function addCard(card) {
    setCards((current) => {
      const found = current.find((item) => item.id === card.id);
      if (found) return current.map((item) => item.id === card.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...card, quantity: 1 }];
    });
  }
  async function save(event) {
    event.preventDefault(); setStatus('กำลังบันทึก…'); setError('');
    try {
      const saved = deck?.id
        ? await request(`/decks/${deck.id}`, { method: 'PUT', body: JSON.stringify({ ...form }) })
        : await request('/decks', { method: 'POST', body: JSON.stringify({ ...form }) });
      const deckId = deck?.id || saved.deck?.id;
      await request(`/decks/${deckId}/cards`, { method: 'PUT', body: JSON.stringify({ cards: cards.map(({ id, quantity }) => ({ cardId: id, quantity })) }) });
      setStatus('บันทึกเด็คแล้ว'); onSaved(); onClose();
    } catch (err) { setError(err.message); setStatus(''); }
  }
  return <form onSubmit={save} className="mb-6 rounded-xl border border-vault-gold/40 bg-white/[.04] p-5">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-vault-teal">Deck workshop</p><h2 className="mt-1 text-xl font-bold">{deck ? 'แก้ไขเด็ค' : 'สร้างเด็คใหม่'}</h2></div><button type="button" onClick={onClose} className="text-sm text-vault-cream/60">ปิด</button></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm">ชื่อเด็ค<input required maxLength="100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2"/></label><label className="text-sm">เกม<select disabled={Boolean(deck)} value={form.game} onChange={(e) => setForm({ ...form, game: e.target.value })} className="mt-1 w-full rounded border border-white/10 bg-vault-background p-2">{Object.entries(gameNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label></div>
    <label className="mt-3 block text-sm">คำอธิบาย<textarea maxLength="1000" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded border border-white/10 bg-black/20 p-2"/></label>
    <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}/>เผยแพร่เป็นเด็คสาธารณะ</label>
    <div className="mt-5 rounded-lg border border-white/10 p-4"><h3 className="font-bold">การ์ดในเด็ค <span className="text-sm font-normal text-vault-cream/50">({cards.reduce((sum, card) => sum + card.quantity, 0)} ใบ)</span></h3>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นการ์ดในเกมที่เลือกเพื่อเพิ่ม…" className="mt-3 w-full rounded border border-white/10 bg-black/20 p-2"/>
      {deckLoading && <p role="status" className="mt-3 text-sm text-vault-teal">กำลังโหลดรายการเด็ค…</p>}
      {searchStatus === 'loading' && <p role="status" className="mt-3 text-sm text-vault-teal">กำลังค้นการ์ด…</p>}
      {results.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{results.map((card) => <button key={card.id} type="button" onClick={() => addCard(card)} className="rounded bg-black/20 p-2 text-left text-xs hover:ring-1 hover:ring-vault-gold"><span className="block truncate font-bold">{card.name}</span><span className="text-vault-cream/50">เพิ่มการ์ด</span></button>)}</div>}
      {searchStatus === 'success' && results.length === 0 && <p className="mt-3 text-sm text-vault-cream/50">ไม่พบการ์ดชื่อนี้ในเกมที่เลือก</p>}
      {cards.length > 0 ? <ul className="mt-4 divide-y divide-white/10">{cards.map((card) => <li key={card.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate">{card.name}</span><span className="flex items-center gap-2"><button type="button" aria-label={`ลด ${card.name}`} onClick={() => setCards((current) => current.map((item) => item.id === card.id ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0))}>−</button>{card.quantity}<button type="button" aria-label={`เพิ่ม ${card.name}`} onClick={() => addCard(card)}>+</button><button type="button" onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))} className="ml-2 text-red-300">นำออก</button></span></li>)}</ul> : <p className="mt-3 text-sm text-vault-cream/50">ยังไม่มีการ์ดในเด็ค</p>}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    <button disabled={deckLoading || Boolean(searchStatus === 'loading')} className="mt-5 rounded bg-vault-gold px-4 py-2 font-bold text-vault-background disabled:opacity-50">{status || 'บันทึกเด็ค'}</button>
  </form>;
}

export default function DecksPage({ publicOnly = false }) {
  const { member } = useAuth();
  const [decks, setDecks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  async function loadDecks() {
    setStatus('loading'); setError('');
    try { const data = await request(publicOnly ? '/decks' : '/me/decks'); setDecks(data.items || []); setStatus('success'); }
    catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { loadDecks(); }, [publicOnly]);
  async function removeDeck(id) {
    if (!window.confirm('ลบเด็คนี้ใช่ไหม?')) return;
    try { await request(`/decks/${id}`, { method: 'DELETE' }); await loadDecks(); }
    catch (err) { setError(err.message); }
  }
  return <main className="mx-auto max-w-7xl px-4 py-8">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-vault-teal">Community tables</p><h1 className="mt-2 text-3xl font-black">{publicOnly ? 'เด็คสาธารณะ' : 'เด็คของฉัน'}</h1></div>{!publicOnly && <button onClick={() => setEditor({})} className="rounded bg-vault-orange px-4 py-2 font-bold">+ สร้างเด็ค</button>}</div>
    {editor && <DeckEditor deck={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={loadDecks}/>}
    {status === 'loading' && <Loading/>}{status === 'error' && <ErrorMessage message={error} onRetry={loadDecks}/>}
    {status === 'success' && (decks.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => <article key={deck.id} className="rounded-xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs uppercase text-vault-teal">{gameNames[deck.game]} · {deck.isPublic ? 'สาธารณะ' : 'ส่วนตัว'}</p><h2 className="mt-2 text-xl font-bold">{deck.name}</h2><p className="mt-2 min-h-10 text-sm text-vault-cream/60">{deck.description}</p>{publicOnly && <p className="mt-2 text-xs text-vault-cream/50">โดย {deck.memberName}</p>}<div className="mt-4 flex gap-2">{publicOnly ? <Link to={`/decks/${deck.id}`} className="text-sm text-vault-gold underline">ดูเด็ค</Link> : <><button onClick={() => setEditor(deck)} className="rounded border border-vault-gold px-3 py-1 text-sm text-vault-gold">แก้ไข</button><button onClick={() => removeDeck(deck.id)} className="rounded border border-red-300/40 px-3 py-1 text-sm text-red-300">ลบ</button></>}</div></article>)}</div> : <Empty>{publicOnly ? 'ยังไม่มีเด็คสาธารณะ' : 'ยังไม่มีเด็ค เริ่มสร้างเด็คแรกของคุณได้เลย'}</Empty>)}
  </main>;
}
