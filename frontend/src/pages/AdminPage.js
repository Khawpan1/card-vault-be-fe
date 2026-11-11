import { useEffect, useState } from 'react';
import { request } from '../api';
import { ErrorMessage, Loading } from '../components/LoadState';

const blankCard = { game: 'vanguard', sourceId: '', name: '', type: '', rarity: '', rulesText: '', imageUrl: '', sourceUrl: 'https://openapi.tcgtracking.com/tcgapi/' };

export default function AdminPage() {
  const [cards, setCards] = useState([]);
  const [members, setMembers] = useState([]);
  const [decks, setDecks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cardOffset, setCardOffset] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [form, setForm] = useState(blankCard);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    setStatus('loading'); setError('');
    try {
      const [cardData, memberData, deckData, reviewData] = await Promise.all([request(`/cards?limit=100&offset=${cardOffset}`), request('/admin/members'), request('/admin/decks'), request('/admin/reviews')]);
      setCards(cardData.items || []); setTotalCards(cardData.total || 0); setMembers(memberData.items || []); setDecks(deckData.items || []); setReviews(reviewData.items || []); setStatus('success');
    } catch (err) { setError(err.message); setStatus('error'); }
  }
  useEffect(() => { load(); }, [cardOffset]);
  async function saveCard(event) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await request(editingId ? `/admin/cards/${editingId}` : '/admin/cards', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form) });
      setForm(blankCard); setEditingId(null); setNotice('บันทึกข้อมูลการ์ดแล้ว'); await load();
    } catch (err) { setError(err.message); }
  }
  async function deleteCard(id) {
    if (!window.confirm('ลบการ์ดนี้ใช่ไหม?')) return;
    try { await request(`/admin/cards/${id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function updateRole(member, role) {
    try { await request(`/admin/members/${member.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function deleteMember(member) {
    if (!window.confirm(`ลบบัญชี ${member.email} ใช่ไหม?`)) return;
    try { await request(`/admin/members/${member.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err.message); }
  }
  async function moderate(path, label) {
    if (!window.confirm(`ลบ${label}นี้ใช่ไหม?`)) return;
    try { await request(path, { method: 'DELETE' }); setNotice(`ลบ${label}แล้ว`); await load(); }
    catch (err) { setError(err.message); }
  }
  function editCard(card) {
    setEditingId(card.id);
    setForm({ game: card.game, sourceId: card.sourceId, name: card.name, type: card.type, rarity: card.rarity, rulesText: card.rulesText, imageUrl: card.imageUrl, sourceUrl: card.sourceUrl, setName: card.setName || '', setCode: card.setCode || '' });
  }
  return <main className="mx-auto max-w-7xl px-4 py-8"><p className="text-xs font-bold uppercase tracking-widest text-vault-orange">Admin area</p><h1 className="mt-2 text-3xl font-black">จัดการระบบ</h1>
    {status === 'loading' && <Loading/>}{status === 'error' && <ErrorMessage message={error} onRetry={load}/>}
    {status === 'success' && <>
      <form onSubmit={saveCard} className="mt-7 rounded-xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">{editingId ? 'แก้ไขการ์ด' : 'เพิ่มการ์ด'}</h2><p className="mt-2 text-sm text-vault-cream/60">Cardfight!! Vanguard</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[['sourceId','รหัสต้นทาง'],['name','ชื่อการ์ด'],['type','ประเภท / ยูนิต'],['rarity','ความหายาก'],['sourceUrl','URL แหล่งข้อมูล'],['imageUrl','URL รูป (ถ้ามี)']].map(([key,label]) => <input key={key} aria-label={label} type={key.endsWith('Url') ? 'url' : 'text'} required={key !== 'imageUrl'} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={label} className="rounded border border-white/10 bg-white/[.05] p-2"/>)}
        <textarea value={form.rulesText} onChange={(e) => setForm({ ...form, rulesText: e.target.value })} placeholder="ข้อความกติกา" className="rounded border border-white/10 bg-white/[.05] p-2 sm:col-span-2"/>
      </div><button className="mt-4 rounded bg-vault-gold px-4 py-2 font-bold text-vault-background">{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มการ์ด'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blankCard); }} className="ml-3 text-sm underline">ยกเลิก</button>}</form>
      <section className="mt-8"><h2 className="text-xl font-bold">การ์ดในคลัง ({totalCards})</h2><div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">{cards.length ? cards.map((card) => <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{card.name} <span className="text-vault-cream/50">· {card.game} · {card.rarity}</span></span><span className="flex gap-3"><button onClick={() => editCard(card)} className="text-vault-gold underline">แก้ไข</button><button onClick={() => deleteCard(card.id)} className="text-red-300 underline">ลบ</button></span></div>) : <p className="p-4 text-sm text-vault-cream/60">ยังไม่มีการ์ดในคลัง</p>}</div>{totalCards>100 && <div className="mt-3 flex items-center justify-center gap-4"><button disabled={cardOffset===0} onClick={() => setCardOffset(Math.max(0,cardOffset-100))} className="rounded border border-white/20 px-3 py-1 disabled:opacity-30">ก่อนหน้า</button><span className="text-sm text-vault-cream/60">หน้า {Math.floor(cardOffset/100)+1} / {Math.ceil(totalCards/100)}</span><button disabled={cardOffset+cards.length>=totalCards} onClick={() => setCardOffset(cardOffset+100)} className="rounded border border-white/20 px-3 py-1 disabled:opacity-30">ถัดไป</button></div>}</section>
      <section className="mt-8"><h2 className="text-xl font-bold">สมาชิก ({members.length})</h2><div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{member.displayName} · {member.email}</span><span className="flex items-center gap-3"><select aria-label={`สิทธิ์ ${member.email}`} value={member.role} onChange={(e) => updateRole(member, e.target.value)} className="rounded bg-vault-background p-1"><option value="member">member</option><option value="admin">admin</option></select><button onClick={() => deleteMember(member)} className="text-red-300 underline">ลบสมาชิก</button></span></div>)}</div></section>
      <section className="mt-8"><h2 className="text-xl font-bold">เด็คทั้งหมดเพื่อกลั่นกรอง ({decks.length})</h2><div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">{decks.length ? decks.map((deck) => <div key={deck.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"><span>{deck.name} · {deck.memberName} · {deck.game}</span><button onClick={() => moderate(`/admin/decks/${deck.id}`, 'เด็ค')} className="text-red-300 underline">ลบเด็ค</button></div>) : <p className="p-4 text-sm text-vault-cream/60">ยังไม่มีเด็ค</p>}</div></section>
      <section className="mt-8"><h2 className="text-xl font-bold">รีวิวเพื่อกลั่นกรอง ({reviews.length})</h2><div className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">{reviews.length ? reviews.map((review) => <div key={review.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm"><div><p className="font-semibold">{review.deckName} · {review.memberName}</p><p className="mt-1 whitespace-pre-line text-vault-cream/70">{review.content}</p></div><button onClick={() => moderate(`/admin/reviews/${review.id}`, 'รีวิว')} className="text-red-300 underline">ลบรีวิว</button></div>) : <p className="p-4 text-sm text-vault-cream/60">ยังไม่มีรีวิว</p>}</div></section>
    </>}
    {(notice || error) && <p role={error ? 'alert' : 'status'} className={`mt-4 text-sm ${error ? 'text-red-300' : 'text-vault-teal'}`}>{error || notice}</p>}
    <p className="mt-8 text-xs text-vault-cream/40">ทุกการเปลี่ยนแปลงในส่วนนี้ต้องผ่าน API ที่ตรวจสิทธิ์ Admin ฝั่งเซิร์ฟเวอร์</p>
  </main>;
}
