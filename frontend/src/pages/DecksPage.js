import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../auth/AuthContext';
import { readDeckDraft } from '../deckDraft';
import DeckEditor from '../components/DeckEditor';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export default function DecksPage({ publicOnly = false }) {
  const auth = useAuth();
  const memberId = auth?.member?.id;
  const [draft, setDraft] = useState(() => publicOnly ? null : readDeckDraft(memberId));
  const [decks, setDecks] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(draft?.deck || null);
  const editorDraft = draft && editor && (draft.deck.id || null) === (editor.id || null) ? draft : null;

  function closeEditor() {
    setDraft(readDeckDraft(memberId));
    setEditor(null);
  }
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-vault-teal">Cardfight!! Vanguard</p><h1 className="mt-2 text-3xl font-black">{publicOnly ? 'เด็ค Vanguard สาธารณะ' : 'เด็ค Vanguard ของฉัน'}</h1></div>{!publicOnly && <button onClick={() => setEditor({})} className="rounded bg-vault-orange px-4 py-2 font-bold text-white hover:bg-vault-orange-hover">+ สร้างเด็ค</button>}</div>
    {!publicOnly && draft && !editor && <button type="button" onClick={() => setEditor(draft.deck)}
      className="mb-5 rounded-lg border border-vault-gold bg-vault-highlight px-4 py-2 font-semibold text-vault-gold">แก้ร่างเด็คต่อ</button>}
    {!publicOnly && editor && <DeckEditor key={editor.id ?? "new"} deck={editor.id ? editor : null} draft={editorDraft}
      memberId={memberId} onSessionExpired={auth?.logout} onClose={closeEditor} onSaved={loadDecks}/>}
    {status === 'loading' && <Loading/>}{status === 'error' && <ErrorMessage message={error} onRetry={loadDecks}/>}
    {status === 'success' && (decks.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{decks.map((deck) => <article key={deck.id} className="rounded-xl border border-vault-line bg-vault-surface p-5"><p className="text-xs uppercase text-vault-teal">{deck.isPublic ? 'สาธารณะ' : 'ส่วนตัว'}</p><h2 className="mt-2 text-xl font-bold">{deck.name}</h2><p className="mt-2 min-h-10 text-sm text-vault-muted">{deck.description}</p>{publicOnly && <p className="mt-2 text-xs text-vault-muted">โดย {deck.memberName}</p>}<div className="mt-4 flex gap-2">{publicOnly ? <Link to={`/decks/${deck.id}`} className="text-sm text-vault-gold underline">ดูเด็ค</Link> : <><button onClick={() => setEditor(deck)} className="rounded border border-vault-gold px-3 py-1 text-sm text-vault-gold">แก้ไข</button><button onClick={() => removeDeck(deck.id)} className="rounded border border-red-200 px-3 py-1 text-sm text-red-700">ลบ</button></>}</div></article>)}</div> : <Empty>{publicOnly ? 'ยังไม่มีเด็คสาธารณะ' : 'ยังไม่มีเด็ค เริ่มสร้างเด็คแรกของคุณได้เลย'}</Empty>)}
  </main>;
}
