import { useEffect, useState } from 'react';
import { request } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function ProfilePage() {
  const { member } = useAuth();
  const [profile, setProfile] = useState(member);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setProfile(member); }, [member]);
  async function saveProfile(event) {
    event.preventDefault(); setMessage(''); setError('');
    try { const data = await request('/me', { method: 'PATCH', body: JSON.stringify({ displayName: profile.displayName }) }); setProfile(data.member); setMessage('บันทึกโปรไฟล์แล้ว'); }
    catch (err) { setError(err.message); }
  }
  async function changePassword(event) {
    event.preventDefault(); setMessage(''); setError('');
    try { await request('/me/password', { method: 'PUT', body: JSON.stringify(passwords) }); setPasswords({ currentPassword: '', newPassword: '' }); setMessage('เปลี่ยนรหัสผ่านแล้ว'); }
    catch (err) { setError(err.message); }
  }
  return <main className="mx-auto grid max-w-3xl gap-5 px-4 py-10">
    <h1 className="text-3xl font-black">โปรไฟล์สมาชิก</h1>
    <form onSubmit={saveProfile} className="rounded-xl border border-vault-line bg-vault-surface p-5"><h2 className="text-lg font-bold">ข้อมูลบัญชี</h2><label className="mt-4 block text-sm">ชื่อที่แสดง<input required maxLength="50" value={profile?.displayName || ''} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} className="mt-2 w-full rounded border border-vault-line bg-vault-inset p-3"/></label><p className="mt-3 text-sm text-vault-muted">อีเมล: {profile?.email}</p><button className="mt-4 rounded bg-vault-orange px-4 py-2 font-bold text-white">บันทึกข้อมูล</button></form>
    <form onSubmit={changePassword} className="rounded-xl border border-vault-line bg-vault-surface p-5"><h2 className="text-lg font-bold">เปลี่ยนรหัสผ่าน</h2>{[['currentPassword','รหัสผ่านปัจจุบัน'],['newPassword','รหัสผ่านใหม่']].map(([key,label]) => <label key={key} className="mt-4 block text-sm">{label}<input required minLength="8" type="password" value={passwords[key]} onChange={(e) => setPasswords({ ...passwords, [key]: e.target.value })} className="mt-2 w-full rounded border border-vault-line bg-vault-inset p-3"/></label>)}<button className="mt-4 rounded border border-vault-gold px-4 py-2 font-bold text-vault-gold">เปลี่ยนรหัสผ่าน</button></form>
    {(message || error) && <p role={error ? 'alert' : 'status'} className={error ? 'text-red-700' : 'text-vault-teal'}>{error || message}</p>}
  </main>;
}
