export function Loading({ label = 'กำลังโหลดข้อมูล…' }) { return <p role="status" className="py-12 text-center text-vault-teal">{label}</p>; }
export function Empty({ children = 'ไม่พบข้อมูลที่ตรงกับการค้นหา' }) { return <p className="py-12 text-center text-vault-cream/60">{children}</p>; }
export function ErrorMessage({ message, onRetry }) { return <div role="alert" className="my-8 rounded-lg border border-red-400/40 bg-red-950/30 p-4 text-center text-red-200">{message}{onRetry && <button onClick={onRetry} className="ml-3 underline">ลองอีกครั้ง</button>}</div>; }
