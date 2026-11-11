const buttonClass = 'rounded-lg border border-vault-line bg-vault-surface px-4 py-2 hover:bg-vault-inset disabled:opacity-50';

export default function CardPagination({ total, offset, pageSize, onChange }) {
  if (total <= pageSize) return null;

  return <nav aria-label="เปลี่ยนหน้ารายการการ์ด" className="mt-6 flex flex-wrap items-center justify-center gap-3">
    <button type="button" disabled={offset === 0} onClick={() => onChange(offset - pageSize)}
      className={buttonClass}>ก่อนหน้า</button>
    <span className="text-sm text-vault-muted">หน้า {Math.floor(offset / pageSize) + 1} / {Math.ceil(total / pageSize)}</span>
    <button type="button" disabled={offset + pageSize >= total} onClick={() => onChange(offset + pageSize)}
      className={buttonClass}>ถัดไป</button>
  </nav>;
}
