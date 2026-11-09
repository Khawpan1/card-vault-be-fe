import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AuthPage({ mode }) {
  const registering = mode === 'register';
  const { member, login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (member) return <Navigate to="/" replace/>;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (registering) await register(form.displayName, form.email, form.password);
      else await login(form.email, form.password);
      navigate('/my/decks');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-4 py-12"><form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/[.04] p-6">
    <p className="text-xs font-bold uppercase tracking-widest text-vault-teal">Card Vault account</p><h1 className="mt-2 text-2xl font-black">{registering ? 'สร้างบัญชีสมาชิก' : 'เข้าสู่ระบบ'}</h1>
    {registering && <label className="mt-5 block text-sm">ชื่อที่แสดง<input required maxLength="50" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3"/></label>}
    <label className="mt-5 block text-sm">อีเมล<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3"/></label>
    <label className="mt-4 block text-sm">รหัสผ่าน<input required type="password" minLength="8" autoComplete={registering ? 'new-password' : 'current-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 p-3"/></label>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    <button disabled={busy} className="mt-6 w-full rounded-lg bg-vault-gold p-3 font-bold text-vault-background disabled:opacity-50">{busy ? 'กำลังดำเนินการ…' : registering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button>
    <p className="mt-5 text-center text-sm text-vault-cream/60">{registering ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'} <Link className="text-vault-teal underline" to={registering ? '/login' : '/register'}>{registering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Link></p>
  </form></main>;
}
