import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import CatalogPage from './pages/CatalogPage';
import CardPage from './pages/CardPage';
import AuthPage from './pages/AuthPage';
import DecksPage from './pages/DecksPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import CollectionPage from './pages/CollectionPage';
import PublicDeckPage from './pages/PublicDeckPage';
import ProtectedRoute from './auth/ProtectedRoute';

function Header() {
  const { member, logout } = useAuth();
  const navClass = ({ isActive }) => `rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-white/10 text-vault-gold' : 'text-white/80 hover:bg-white/[.06] hover:text-white'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link className="flex items-center gap-2 text-lg font-black tracking-wide text-white sm:text-xl" to="/"><span className="grid h-9 w-9 place-items-center rounded-xl bg-vault-orange text-sm text-white">VG</span><span>VANGUARD VAULT</span></Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="เมนูหลัก">
          <NavLink to="/cards" className={navClass}>คลังการ์ด</NavLink>
          <NavLink to="/decks" className={navClass}>เด็คสาธารณะ</NavLink>
          {member ? <>
            <NavLink to="/my/decks" className={navClass}>เด็คของฉัน</NavLink>
            <NavLink to="/collection" className={navClass}>คอลเลกชัน</NavLink>
            <NavLink to="/profile" className={navClass}>โปรไฟล์</NavLink>
            {member.role === 'admin' && <NavLink to="/admin" className={navClass}>จัดการระบบ</NavLink>}
            <button className="ml-1 rounded-lg border border-vault-gold/70 px-3 py-2 font-semibold text-vault-gold hover:bg-vault-gold hover:text-vault-background" onClick={logout}>ออกจากระบบ</button>
          </> : <Link to="/login" className="ml-1 rounded-lg bg-vault-orange px-4 py-2 font-bold text-white hover:bg-[#ff853f]">เข้าสู่ระบบ</Link>}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
    <section className="relative isolate overflow-hidden rounded-3xl border border-vault-orange/30 bg-zinc-950 px-6 py-14 text-white shadow-2xl sm:px-12 sm:py-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_35%,rgba(243,107,33,.28),transparent_42%),linear-gradient(125deg,transparent_45%,rgba(37,138,136,.16)_45%,transparent_75%)]"/>
      <p className="text-xs font-bold uppercase tracking-[.25em] text-vault-gold">Cardfight!! Vanguard · Card Archive</p>
      <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">เปิดคลังการ์ด<br/><span className="text-vault-orange">แล้วจัดเด็คของคุณ</span></h1>
      <p className="mt-5 max-w-xl leading-7 text-white/70">ค้นหาการ์ด Vanguard ดูรายละเอียด และเลือกการ์ดจากภาพเพื่อสร้างเด็คของคุณ</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/cards" className="rounded-xl bg-vault-orange px-5 py-3 font-bold text-white hover:bg-[#ff853f]">เปิดคลังการ์ด <span aria-hidden="true">→</span></Link><Link to="/decks" className="rounded-xl border border-white/25 px-5 py-3 font-bold text-white hover:bg-white/10">ดูเด็คสาธารณะ</Link></div>
    </section>
  </main>;
}

export default function App() {
  return <AuthProvider><BrowserRouter><div className="min-h-screen bg-vault-background text-vault-cream"><Header/><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/cards" element={<CatalogPage/>}/>
    <Route path="/cards/:cardId" element={<CardPage/>}/>
    <Route path="/decks" element={<DecksPage publicOnly/>}/>
    <Route path="/decks/:deckId" element={<PublicDeckPage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route path="/my/decks" element={<DecksPage/>}/>
      <Route path="/collection" element={<CollectionPage/>}/>
      <Route path="/profile" element={<ProfilePage/>}/>
      <Route path="/admin" element={<ProtectedRoute admin/>}><Route index element={<AdminPage/>}/></Route>
    </Route>
    <Route path="*" element={<main className="p-12 text-center">ไม่พบหน้าที่ต้องการ</main>}/>
  </Routes><footer className="mt-16 border-t border-zinc-800 bg-zinc-950 px-4 py-6 text-center text-xs text-white/60">ข้อมูลและรูปการ์ดจาก <a href="https://openapi.tcgtracking.com/tcgapi/" target="_blank" rel="noreferrer" className="underline">Open TCG API (TCGTracking)</a> · การ์ดเดิมจาก PokéWallet</footer></div></BrowserRouter></AuthProvider>;
}
