import { useEffect, useState } from 'react';
import { request } from '../api';

const fieldClass = 'min-w-0 w-full rounded-xl border border-vault-control bg-vault-surface px-4 py-3 font-normal disabled:opacity-60';

export default function CardFilters({ filters, onChange }) {
  const [options, setOptions] = useState({ sets: [], rarities: [] });
  const [status, setStatus] = useState('loading');

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    request('/cards/filters')
      .then((data) => {
        if (!active) return;
        setOptions({ sets: data.sets || [], rarities: data.rarities || [] });
        setStatus('success');
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [retry]);

  return <>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        ค้นหาชื่อการ์ด
        <input value={filters.q} onChange={(event) => onChange('q', event.target.value)}
          placeholder="ค้นหาชื่อการ์ด…" className={fieldClass}/>
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        ชุดการ์ด
        <select value={filters.setName} onChange={(event) => onChange('setName', event.target.value)}
          disabled={status !== 'success'} className={fieldClass}>
          <option value="">{status === 'loading' ? 'กำลังโหลดชุดการ์ด…' : 'ทุกชุด'}</option>
          {options.sets.map((set) => <option key={set} value={set}>{set}</option>)}
        </select>
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        ความหายาก
        <select value={filters.rarityExact} onChange={(event) => onChange('rarityExact', event.target.value)}
          disabled={status !== 'success'} className={fieldClass}>
          <option value="">{status === 'loading' ? 'กำลังโหลดความหายาก…' : 'ทุกความหายาก'}</option>
          {options.rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
        </select>
      </label>
    </div>
    {status === 'error' && <p role="alert" className="mt-3 text-sm text-red-700">
      โหลดตัวเลือกชุดการ์ดและความหายากไม่สำเร็จ
      <button type="button" onClick={() => setRetry(retry + 1)} className="ml-2 underline">โหลดตัวกรองอีกครั้ง</button>
    </p>}
  </>;
}
