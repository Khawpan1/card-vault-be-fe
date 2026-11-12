import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import CatalogPage from './pages/CatalogPage';
import CardPage from './pages/CardPage';
import AuthPage from './pages/AuthPage';
import DecksPage from './pages/DecksPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage, { adminSections } from './pages/AdminPage';
import CollectionPage from './pages/CollectionPage';
import PublicDeckPage from './pages/PublicDeckPage';
import ProtectedRoute from './auth/ProtectedRoute';

function Header() {
  const { member, logout } = useAuth();
  const { pathname } = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);
  const navClass = ({ isActive }) => `rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-vault-highlight font-semibold text-vault-gold' : 'text-vault-muted hover:bg-vault-inset hover:text-vault-ink'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-vault-line bg-vault-surface shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link className="flex items-center gap-2 text-lg font-black tracking-wide text-vault-ink sm:text-xl" to="/"><span className="grid h-9 w-9 place-items-center rounded-xl bg-vault-orange text-sm text-white">VG</span><span>VANGUARD VAULT</span></Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="เมนูหลัก">
          <NavLink to="/cards" className={navClass}>คลังการ์ด</NavLink>
          <NavLink to="/decks" className={navClass}>เด็คสาธารณะ</NavLink>
          {member ? <>
            <NavLink to="/my/decks" className={navClass}>เด็คของฉัน</NavLink>
            <NavLink to="/collection" className={navClass}>คอลเลกชัน</NavLink>
            <NavLink to="/profile" className={navClass}>โปรไฟล์</NavLink>
            {member.role === 'admin' && <div className="relative" onKeyDown={(event) => {
              if (event.key === 'Escape') setAdminOpen(false);
            }}>
              <button type="button" aria-expanded={adminOpen} aria-controls="admin-navigation"
                className={navClass({ isActive: pathname.startsWith('/admin') })}
                onClick={() => setAdminOpen(!adminOpen)}>จัดการระบบ <span aria-hidden="true">▾</span></button>
              {adminOpen && <div id="admin-navigation" className="absolute right-0 z-30 mt-2 grid w-52 gap-1 rounded-xl border border-vault-line bg-vault-surface p-2 shadow-lg">
                {adminSections.map(([key, label]) => <NavLink key={key} to={`/admin/${key}`} className={navClass}
                  onClick={() => setAdminOpen(false)}>{label}</NavLink>)}
              </div>}
            </div>}
            <button className="ml-1 rounded-lg border border-vault-gold/70 px-3 py-2 font-semibold text-vault-gold hover:bg-vault-highlight" onClick={logout}>ออกจากระบบ</button>
          </> : <Link to="/login" className="ml-1 rounded-lg bg-vault-orange px-4 py-2 font-bold text-white hover:bg-vault-orange-hover">เข้าสู่ระบบ</Link>}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
    <section className="overflow-hidden rounded-3xl border border-vault-line bg-gradient-to-br from-vault-hero via-vault-surface to-vault-highlight px-6 py-14 shadow-sm sm:px-12 sm:py-20">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-vault-gold">Cardfight!! Vanguard · Card Archive</p>
      <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">เปิดคลังการ์ด<br/><span className="text-vault-orange">แล้วจัดเด็คของคุณ</span></h1>
      <p className="mt-5 max-w-xl leading-7 text-vault-muted">ค้นหาการ์ด Vanguard ดูรายละเอียด และเลือกการ์ดจากภาพเพื่อสร้างเด็คของคุณ</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/cards" className="rounded-xl bg-vault-orange px-5 py-3 font-bold text-white hover:bg-vault-orange-hover">เปิดคลังการ์ด <span aria-hidden="true">→</span></Link><Link to="/decks" className="rounded-xl border border-vault-line bg-vault-surface px-5 py-3 font-bold text-vault-ink hover:bg-vault-inset">ดูเด็คสาธารณะ</Link></div>
    </section>
  </main>;
}

export default function App() {
  return <AuthProvider><BrowserRouter><div className="min-h-screen bg-vault-background text-vault-ink"><Header/><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/cards" element={<CatalogPage/>}/>
    <Route path="/cards/:cardId" element={<CardPage/>}/>
    <Route path="/decks" element={<DecksPage key="public-decks" publicOnly/>}/>
    <Route path="/decks/:deckId" element={<PublicDeckPage/>}/>
    <Route path="/login" element={<AuthPage mode="login"/>}/>
    <Route path="/register" element={<AuthPage mode="register"/>}/>
    <Route element={<ProtectedRoute/>}>
      <Route path="/my/decks" element={<DecksPage key="member-decks"/>}/>
      <Route path="/collection" element={<CollectionPage/>}/>
      <Route path="/profile" element={<ProfilePage/>}/>
      <Route path="/admin" element={<ProtectedRoute admin/>}>
        <Route index element={<AdminPage/>}/>
        <Route path=":section" element={<AdminPage/>}/>
      </Route>
    </Route>
    <Route path="*" element={<main className="p-12 text-center">ไม่พบหน้าที่ต้องการ</main>}/>
  </Routes><footer className="mt-16 border-t border-vault-line bg-vault-surface px-4 py-6 text-center text-xs text-vault-muted">ข้อมูลและรูปการ์ดจาก <a href="https://openapi.tcgtracking.com/tcgapi/" target="_blank" rel="noreferrer" className="underline">Open TCG API (TCGTracking)</a> · การ์ดเดิมจาก PokéWallet</footer></div></BrowserRouter></AuthProvider>;
}
