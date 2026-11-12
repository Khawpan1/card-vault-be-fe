import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../api';
import { clearDeckDraft, saveDeckDraft } from '../deckDraft';
import { cardImageUrl, handleCardImageError } from '../cardImage';
import CardFilters from './CardFilters';
import CardPagination from './CardPagination';
import { Empty, ErrorMessage, Loading } from './LoadState';

const pageSize = 8;
const maxCopies = 4;

export default function DeckEditor({ deck, draft, memberId, onSessionExpired, onClose, onSaved }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(draft?.form || {
    name: deck?.name || '',
    description: deck?.description || '',
    isPublic: deck?.isPublic || false,
  });
  const [cards, setCards] = useState(draft?.cards || deck?.cards || []);
  const [deckLoading, setDeckLoading] = useState(Boolean(deck?.id && !draft));
  const [deckLoadError, setDeckLoadError] = useState('');
  const [filters, setFilters] = useState({ q: '', setName: '', rarityExact: '' });
  const [offset, setOffset] = useState(0);
  const [searchResult, setSearchResult] = useState({ status: 'loading' });
  const [retrySearch, setRetrySearch] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedDeckId, setSavedDeckId] = useState(draft?.savedDeckId || deck?.id);
  const [dirty, setDirty] = useState(false);
  const [draftStored, setDraftStored] = useState(Boolean(draft));
  const overLimit = cards.some((card) => card.quantity > maxCopies);
  const editingDisabled = deckLoading || Boolean(deckLoadError) || saving;

  useEffect(() => {
    if (!deck?.id || draft) return;
    let active = true;
    request(`/decks/${deck.id}`)
      .then((data) => { if (active) setCards(data.deck.cards || []); })
      .catch((error) => { if (active) setDeckLoadError(error.message); })
      .finally(() => { if (active) setDeckLoading(false); });
    return () => { active = false; };
  }, [deck?.id, draft]);

  useEffect(() => {
    if (!dirty) return;
    // เก็บร่างในเบราว์เซอร์ของบัญชีนี้ก่อนส่งไปบันทึก
    setDraftStored(saveDeckDraft(memberId, { deck: deck || {}, form, cards, savedDeckId }));
  }, [dirty, memberId, deck, form, cards, savedDeckId]);

  useEffect(() => {
    let active = true;
    setSearchResult({ status: 'loading' });
    const query = new URLSearchParams({ game: 'vanguard', limit: String(pageSize), offset: String(offset) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    request(`/cards?${query}`)
      .then((data) => {
        if (active) setSearchResult({ status: 'success', items: data.items || [], total: data.total || 0 });
      })
      .catch((error) => {
        if (active) setSearchResult({ status: 'error', error: error.message });
      });
    return () => { active = false; };
  }, [filters, offset, retrySearch]);

  function updateFilter(field, value) {
    setOffset(0);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function addCard(card) {
    setDirty(true);
    setCards((current) => {
      const existing = current.find((item) => item.id === card.id);
      if (!existing) return [...current, { ...card, quantity: 1 }];
      if (existing.quantity >= maxCopies) return current;
      return current.map((item) => item.id === card.id ? { ...item, quantity: item.quantity + 1 } : item);
    });
  }

  function decreaseCard(cardId) {
    setDirty(true);
    setCards((current) => current
      .map((item) => item.id === cardId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0));
  }

  function updateForm(field, value) {
    setDirty(true);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function removeCard(cardId) {
    setDirty(true);
    setCards((current) => current.filter((item) => item.id !== cardId));
  }

  async function save(event) {
    event.preventDefault();
    if (editingDisabled || overLimit) return;
    setSaving(true);
    setSaveError('');
    let deckId = savedDeckId;
    try {
      if (deckId) {
        await request(`/decks/${deckId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        const data = await request('/decks', {
          method: 'POST',
          body: JSON.stringify({ ...form, game: 'vanguard' }),
        });
        deckId = data.deck.id;
        setSavedDeckId(deckId);
      }
      await request(`/decks/${deckId}/cards`, {
        method: 'PUT',
        body: JSON.stringify({ cards: cards.map(({ id, quantity }) => ({ cardId: id, quantity })) }),
      });
      if (draftStored) clearDeckDraft(memberId);
      onSaved();
      onClose();
    } catch (error) {
      if (error.status === 401 && onSessionExpired &&
          saveDeckDraft(memberId, { deck: deck || {}, form, cards, savedDeckId: deckId })) {
        onSessionExpired();
        navigate('/login', { replace: true, state: { deckSessionExpired: true } });
      } else {
        setSaveError(error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const totalCopies = cards.reduce((sum, card) => sum + card.quantity, 0);
  const deckCardGrid = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4';

  return <form onSubmit={save} className="mx-auto mb-8 max-w-5xl rounded-2xl border border-vault-gold/30 bg-vault-surface p-5 shadow-sm sm:p-7">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold">{deck ? 'แก้ไขเด็ค' : 'สร้างเด็คใหม่'}</h2>
      <button type="button" onClick={onClose} disabled={saving} className="text-sm text-vault-muted">ปิด</button>
    </div>
    <label className="mt-5 block text-sm font-semibold">
      ชื่อเด็ค
      <input required maxLength="100" value={form.name} disabled={editingDisabled}
        onChange={(event) => updateForm('name', event.target.value)}
        className="mt-2 w-full rounded-xl border border-vault-line bg-vault-inset px-3 py-2.5 font-normal"/>
    </label>
    <label className="mt-4 block text-sm font-semibold">
      คำอธิบาย
      <textarea maxLength="1000" value={form.description} disabled={editingDisabled}
        onChange={(event) => updateForm('description', event.target.value)}
        className="mt-2 min-h-24 w-full rounded-xl border border-vault-line bg-vault-inset px-3 py-2.5 font-normal"/>
    </label>
    <label className="mt-3 flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form.isPublic} disabled={editingDisabled}
        onChange={(event) => updateForm('isPublic', event.target.checked)}/>
      เผยแพร่เป็นเด็คสาธารณะ
    </label>

    <section aria-label="เลือกการ์ด" className="mt-5 rounded-xl border border-vault-line p-4">
      <h3 className="mb-4 font-bold">เลือกการ์ดเพิ่มลงเด็ค</h3>
      <CardFilters filters={filters} onChange={updateFilter}/>
      {searchResult.status === 'loading' && <Loading label="กำลังค้นการ์ด…"/>}
      {searchResult.status === 'error' && <ErrorMessage message={searchResult.error} onRetry={() => setRetrySearch((n) => n + 1)}/>}
      {searchResult.status === 'success' && <>
        {searchResult.items.length === 0 ? <Empty>ไม่พบการ์ดที่ตรงกับตัวกรอง</Empty> :
          <div className={`mt-4 ${deckCardGrid}`}>
            {searchResult.items.map((card) => {
              const atLimit = cards.some((item) => item.id === card.id && item.quantity >= maxCopies);
              return <button key={card.id} type="button" aria-label={`${card.name} เพิ่มการ์ด`}
                onClick={() => addCard(card)} disabled={editingDisabled || atLimit}
                className="overflow-hidden rounded-lg border border-vault-line bg-vault-inset text-left transition-colors enabled:hover:border-vault-gold focus:outline-none focus:ring-2 focus:ring-vault-gold">
                <img src={cardImageUrl(card)} onError={handleCardImageError} alt={card.name} loading="lazy"
                  className="aspect-[3/4] w-full object-contain"/>
                <span className="block truncate px-2 pt-2 text-xs font-bold" title={card.name}>{card.name}</span>
                <span className="block truncate px-2 pt-1 text-[11px] text-vault-muted">{card.type}</span>
                <span className="block truncate px-2 pb-2 pt-1 text-[11px] text-vault-gold">{card.rarity}</span>
                <span className={`mx-2 mb-2 block rounded px-2 py-1 text-center text-xs font-bold ${atLimit ? 'bg-vault-line text-vault-muted' : 'bg-vault-orange text-white'}`}>
                  {atLimit ? `ครบ ${maxCopies} ใบ` : 'เพิ่มการ์ด'}
                </span>
              </button>;
            })}
          </div>}
        <CardPagination total={searchResult.total} offset={offset} pageSize={pageSize} onChange={setOffset}/>
      </>}
    </section>

    <section aria-label="การ์ดในเด็ค" className="mt-5 rounded-xl border border-vault-line p-4">
      <h3 className="font-bold">การ์ดในเด็ค <span className="text-sm font-normal text-vault-muted">({totalCopies} ใบ)</span></h3>
      <p className="mt-1 text-sm text-vault-muted">การ์ดแต่ละรายการใส่ได้สูงสุด {maxCopies} ใบ</p>
      {deckLoading && <Loading label="กำลังโหลดรายการเด็ค…"/>}
      {deckLoadError && <ErrorMessage message={deckLoadError}/>}
      {overLimit && <p role="alert" className="mt-3 text-sm text-red-700">ลดจำนวนการ์ดที่เกิน {maxCopies} ใบก่อนบันทึกเด็ค</p>}
      {cards.length > 0 ? <ul className={`mt-4 ${deckCardGrid}`}>
        {cards.map((card) => <li key={card.id} className="overflow-hidden rounded-lg border border-vault-line bg-vault-inset">
          <img src={cardImageUrl(card)} onError={handleCardImageError} alt={card.name} loading="lazy" className="aspect-[3/4] w-full object-contain"/>
          <div className="p-2">
            <p className="truncate text-xs font-bold" title={card.name}>{card.name}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" aria-label={`ลด ${card.name}`} onClick={() => decreaseCard(card.id)} disabled={editingDisabled}>−</button>
              <span className={card.quantity > maxCopies ? 'font-bold text-red-700' : ''}>{card.quantity} ใบ</span>
              <button type="button" aria-label={`เพิ่ม ${card.name}`} onClick={() => addCard(card)}
                disabled={editingDisabled || card.quantity >= maxCopies} className="disabled:opacity-40">+</button>
              <button type="button" onClick={() => removeCard(card.id)}
                disabled={editingDisabled} className="text-red-700">นำออก</button>
            </div>
          </div>
        </li>)}
      </ul> : !deckLoading && !deckLoadError && <p className="mt-3 text-sm text-vault-muted">ยังไม่มีการ์ดในเด็ค</p>}
    </section>

    {draftStored && <p className="mt-3 text-sm text-vault-muted">เก็บร่างไว้ในเบราว์เซอร์นี้แล้ว</p>}
    {saveError && <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p>}
    <button disabled={editingDisabled || overLimit}
      className="mt-5 rounded-xl bg-vault-orange px-5 py-3 font-bold text-white hover:bg-vault-orange-hover disabled:opacity-50">
      {saving ? 'กำลังบันทึก…' : 'บันทึกเด็ค'}
    </button>
  </form>;
}
