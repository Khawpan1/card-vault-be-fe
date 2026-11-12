import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { request } from '../api';
import CardFilters from '../components/CardFilters';
import CardPagination from '../components/CardPagination';
import CardTile from '../components/CardTile';
import { Empty, ErrorMessage, Loading } from '../components/LoadState';

export const adminSections = [
  ['cards', 'การ์ดในคลัง'],
  ['members', 'สมาชิก'],
  ['decks', 'เด็คสาธารณะทั้งหมด'],
  ['reviews', 'รีวิวเด็คทั้งหมด'],
];

const blankCard = {
  game: 'vanguard', sourceId: '', name: '', type: '', rarity: '', rulesText: '', imageUrl: '',
  sourceUrl: 'https://openapi.tcgtracking.com/tcgapi/', setName: '', setCode: '',
  grade: '', nation: '', clan: '', unit: '',
};
const cardFields = [
  ['sourceId', 'รหัสต้นทาง', true], ['name', 'ชื่อการ์ด', true], ['rarity', 'ความหายาก', true],
  ['grade', 'เกรด'], ['nation', 'เนชั่น'], ['clan', 'แคลน'], ['unit', 'ยูนิท'],
  ['type', 'ประเภทที่แสดง'], ['setName', 'ชื่อชุด'], ['setCode', 'รหัสชุด'],
  ['imageUrl', 'URL รูป'], ['sourceUrl', 'URL แหล่งข้อมูล', true],
];
const inputClass = 'mt-1 w-full rounded-lg border border-vault-line bg-vault-inset px-3 py-2 font-normal';

function AdminCards() {
  const pageSize = 12;
  const [filters, setFilters] = useState({});
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState(blankCard);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const query = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    request('/cards?' + query.toString())
      .then((data) => {
        if (!active) return;
        if (offset > 0 && offset >= data.total) {
          setOffset(Math.max(0, Math.floor((data.total - 1) / pageSize) * pageSize));
          return;
        }
        setItems(data.items || []);
        setTotal(data.total);
        setStatus('success');
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err.message);
        setStatus('error');
      });
    return () => { active = false; };
  }, [filters, offset, retry]);

  function updateFilter(field, value) {
    setOffset(0);
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function openForm(card) {
    setError('');
    setNotice('');
    setEditingId(card?.id || null);
    setForm(card ? Object.fromEntries(Object.keys(blankCard).map((field) => [field, card[field] ?? blankCard[field]])) : blankCard);
    setShowForm(true);
  }

  async function saveCard(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const type = form.type.trim() || [form.unit, form.nation, form.clan].filter(Boolean).join(' · ') || 'ไม่ระบุ';
      await request(editingId ? `/admin/cards/${editingId}` : '/admin/cards', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({ ...form, type }),
      });
      setShowForm(false);
      setNotice('บันทึกข้อมูลการ์ดแล้ว');
      setRetry((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard(card) {
    if (!window.confirm(`ลบการ์ด ${card.name} ใช่ไหม?`)) return;
    setError('');
    setNotice('');
    try {
      await request(`/admin/cards/${card.id}`, { method: 'DELETE' });
      if (editingId === card.id) setShowForm(false);
      setNotice('ลบการ์ดแล้ว');
      setRetry((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-black">การ์ดในคลัง <span className="text-base font-normal text-vault-muted">({total.toLocaleString()})</span></h1>
      <button type="button" onClick={() => openForm()} disabled={saving} className="rounded-lg bg-vault-orange px-4 py-2 font-bold text-white">เพิ่มการ์ด</button>
    </div>
    {showForm && <form onSubmit={saveCard} className="mt-5 rounded-xl border border-vault-line bg-vault-surface p-5">
      <h2 className="text-xl font-bold">{editingId ? `แก้ไข ${form.name}` : 'เพิ่มการ์ดใหม่'}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cardFields.map(([key, label, required]) => <label key={key} className="min-w-0 text-sm font-semibold">
          {label}
          <input type={key.endsWith('Url') ? 'url' : 'text'} required={required} value={form[key]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })} className={inputClass}/>
        </label>)}
        <label className="text-sm font-semibold sm:col-span-2">
          ข้อความกติกา
          <textarea value={form.rulesText} onChange={(event) => setForm({ ...form, rulesText: event.target.value })} className={inputClass}/>
        </label>
      </div>
      <div className="mt-4 flex gap-3">
        <button disabled={saving} className="rounded-lg bg-vault-orange px-4 py-2 font-bold text-white disabled:opacity-50">
          {saving ? 'กำลังบันทึก…' : 'บันทึกการ์ด'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="text-sm underline">ปิด</button>
      </div>
    </form>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 text-vault-teal">{notice}</p>}
    <section aria-label="ตัวกรองการ์ดในคลัง" className="mt-6 rounded-xl border border-vault-line bg-vault-surface p-4">
      <CardFilters filters={filters} onChange={updateFilter}/>
    </section>
    {status === 'loading' && <Loading/>}
    {status === 'error' && <ErrorMessage message={loadError} onRetry={() => setRetry((n) => n + 1)}/>}
    {status === 'success' && <>
      {items.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {items.map((card) => <div key={card.id} className="min-w-0 rounded-2xl border border-vault-line bg-vault-surface">
          <CardTile card={card}/>
          <div className="flex flex-wrap gap-3 p-3 text-sm">
            <button type="button" onClick={() => openForm(card)} disabled={saving} className="text-vault-gold underline">แก้ไข</button>
            <button type="button" onClick={() => deleteCard(card)} disabled={saving} className="text-red-700 underline">ลบ</button>
          </div>
        </div>)}
      </div> : <Empty/>}
      <CardPagination total={total} offset={offset} pageSize={pageSize} onChange={setOffset}/>
    </>}
  </>;
}

function AdminList({ section, title }) {
  const pageSize = 20;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');
    request(`/admin/${section}?limit=${pageSize}&offset=${offset}`)
      .then((data) => {
        if (!active) return;
        if (offset > 0 && offset >= data.total) {
          setOffset(Math.max(0, Math.floor((data.total - 1) / pageSize) * pageSize));
          return;
        }
        setItems(data.items || []);
        setTotal(data.total);
        setStatus('success');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus('error');
      });
    return () => { active = false; };
  }, [section, offset, retry]);

  async function updateRole(member, role) {
    setError('');
    try {
      await request(`/admin/members/${member.id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      setRetry((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteItem(id, label) {
    if (!window.confirm(`ลบ${label}ใช่ไหม?`)) return;
    setError('');
    try {
      await request(`/admin/${section}/${id}`, { method: 'DELETE' });
      setRetry((n) => n + 1);
    } catch (err) {
      setError(err.message);
    }
  }

  return <>
    <h1 className="text-3xl font-black">{title} <span className="text-base font-normal text-vault-muted">({total.toLocaleString()})</span></h1>
    {status === 'loading' && <Loading/>}
    {error && <ErrorMessage message={error} onRetry={status === 'error' ? () => setRetry((n) => n + 1) : undefined}/>}
    {status === 'success' && <>
      {items.length ? <ul className="mt-6 divide-y divide-vault-line rounded-xl border border-vault-line bg-vault-surface">
        {items.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
          {section === 'members' && <>
            <div className="min-w-0 break-words"><p className="font-bold">{item.displayName}</p><p className="text-vault-muted">{item.email}</p></div>
            <div className="flex items-center gap-3">
              <select aria-label={`สิทธิ์ ${item.email}`} value={item.role} onChange={(event) => updateRole(item, event.target.value)} className="rounded border border-vault-line bg-vault-background p-1">
                <option value="member">member</option><option value="admin">admin</option>
              </select>
              <button type="button" onClick={() => deleteItem(item.id, `บัญชี ${item.email} `)} className="text-red-700 underline">ลบสมาชิก</button>
            </div>
          </>}
          {section === 'decks' && <>
            <div className="min-w-0 break-words">
              <p className="font-bold">{item.name}</p>
              <p className="text-vault-muted">โดย {item.memberName}</p>
              {item.description && <p className="mt-1 whitespace-pre-line text-vault-muted">{item.description}</p>}
            </div>
            <div className="flex gap-3">
              <Link to={`/decks/${item.id}`} className="text-vault-teal underline">ดูรายละเอียดเด็ค</Link>
              <button type="button" onClick={() => deleteItem(item.id, `เด็ค ${item.name} `)} className="text-red-700 underline">ลบเด็ค</button>
            </div>
          </>}
          {section === 'reviews' && <>
            <div className="min-w-0 break-words">
              <p className="font-bold">{item.deckName} · {item.memberName}</p>
              <p className="mt-1 whitespace-pre-line text-vault-muted">{item.content}</p>
            </div>
            <button type="button" onClick={() => deleteItem(item.id, 'รีวิวนี้')} className="text-red-700 underline">ลบรีวิว</button>
          </>}
        </li>)}
      </ul> : <Empty>ยังไม่มีรายการ</Empty>}
      <CardPagination total={total} offset={offset} pageSize={pageSize} onChange={setOffset} label={`เปลี่ยนหน้า${title}`}/>
    </>}
  </>;
}

export default function AdminPage() {
  const { section } = useParams();
  const current = adminSections.find(([key]) => key === section);
  if (!current) return <Navigate to="/admin/cards" replace/>;

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
    {section === 'cards' ? <AdminCards/> : <AdminList key={section} section={section} title={current[1]}/>}
  </main>;
}
