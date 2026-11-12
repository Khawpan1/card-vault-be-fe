import { useEffect, useState } from 'react';
import { request } from '../api';

const fieldClass = 'min-w-0 w-full rounded-xl border border-vault-control bg-vault-surface px-4 py-3 font-normal disabled:opacity-60';
const selects = [
  ['setName', 'ชุดการ์ด', 'ทุกชุด', 'sets'],
  ['rarityExact', 'ความหายาก', 'ทุกความหายาก', 'rarities'],
  ['grade', 'เกรด', 'ทุกเกรด', 'grades'],
  ['nation', 'เนชั่น', 'ทุกเนชั่น', 'nations'],
  ['clan', 'แคลน', 'ทุกแคลน', 'clans'],
  ['unit', 'ยูนิท', 'ทุกยูนิท', 'units'],
];

export default function CardFilters({ filters, onChange }) {
  const [options, setOptions] = useState({});
  const [status, setStatus] = useState('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    request('/cards/filters')
      .then((data) => {
        if (!active) return;
        setOptions({ ...data, grades: [...(data.grades || [])].sort((a, b) => Number(a) - Number(b)) });
        setStatus('success');
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [retry]);

  return <>
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        ค้นหาชื่อการ์ด
        <input value={filters.q || ''} onChange={(event) => onChange('q', event.target.value)}
          placeholder="ค้นหาชื่อการ์ด…" className={fieldClass}/>
      </label>
      {selects.map(([key, label, placeholder, optionKey]) => <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold">
        {label}
        <select value={filters[key] || ''} onChange={(event) => onChange(key, event.target.value)}
          disabled={status !== 'success'} className={fieldClass}>
          <option value="">{status === 'loading' ? 'กำลังโหลด…' : placeholder}</option>
          {key === 'clan' && options.clans?.length > 0 && <option value="__none__">ไม่มีแคลน / ไม่ระบุ</option>}
          {(options[optionKey] || []).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>)}
    </div>
    {status === 'error' && <p role="alert" className="mt-3 text-sm text-red-700">
      โหลดตัวกรองไม่สำเร็จ
      <button type="button" onClick={() => setRetry(retry + 1)} className="ml-2 underline">โหลดตัวกรองอีกครั้ง</button>
    </p>}
  </>;
}
