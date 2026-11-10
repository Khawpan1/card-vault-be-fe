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
  const navClass = ({ isActive }) => `rounded-lg px-3 py-2 transition-colors ${isActive ? 'bg-white/[.08] text-vault-gold' : 'text-vault-cream/75 hover:bg-white/[.05] hover:text-vault-cream'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-vault-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link className="flex items-center gap-2 text-lg font-black tracking-wide text-vault-gold sm:text-xl" to="/"><span className="grid h-9 w-9 place-items-center rounded-xl bg-vault-gold text-sm text-vault-background">CV</span><span>CARD VAULT</span></Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="เมนูหลัก">
          <NavLink to="/cards" className={navClass}>คลังการ์ด</NavLink>
          <NavLink to="/decks" className={navClass}>เด็คสาธารณะ</NavLink>
          {member ? <>
            <NavLink to="/my/decks" className={navClass}>เด็คของฉัน</NavLink>
            <NavLink to="/collection" className={navClass}>คอลเลกชัน</NavLink>
            <NavLink to="/profile" className={navClass}>โปรไฟล์</NavLink>
            {member.role === 'admin' && <NavLink to="/admin" className={navClass}>จัดการระบบ</NavLink>}
            <button className="ml-1 rounded-lg border border-vault-gold/70 px-3 py-2 font-semibold text-vault-gold hover:bg-vault-gold hover:text-vault-background" onClick={logout}>ออกจากระบบ</button>
          </> : <Link to="/login" className="ml-1 rounded-lg bg-vault-gold px-4 py-2 font-bold text-vault-background hover:bg-[#e3c34d]">เข้าสู่ระบบ</Link>}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  return <main className="mx-auto max-w-7xl px-4 py-16">
    <section className="overflow-hidden rounded-3xl border border-vault-gold/25 bg-gradient-to-br from-white/[.07] via-transparent to-vault-orange/[.08] px-6 py-12 sm:px-12 sm:py-16">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-vault-teal">Your cards, your strategy</p>
      <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">คลังการ์ดเดียว<br/><span className="text-vault-gold">จัดเด็คได้ทุกเกม</span></h1>
      <p className="mt-5 max-w-xl leading-7 text-vault-cream/70">สำรวจการ์ด Yu-Gi-Oh!, Magic: The Gathering, Pokémon TCG และ One Piece พร้อมสร้างเด็คในแบบของคุณ</p>
      <Link to="/cards" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-vault-gold px-5 py-3 font-bold text-vault-background hover:bg-[#e3c34d]">เปิดคลังการ์ด <span aria-hidden="true">→</span></Link>
    </section>
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {['Yu-Gi-Oh!', 'Magic: The Gathering', 'Pokémon TCG', 'One Piece Card Game'].map((game, index) => <div key={game} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p className="text-xs font-semibold uppercase tracking-widest text-vault-teal">0{index + 1} · Card archive</p><h2 className="mt-3 text-lg font-bold">{game}</h2></div>)}
    </div>
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
  </Routes><footer className="mt-16 border-t border-white/10 px-4 py-6 text-center text-xs text-vault-cream/50">ข้อมูลการ์ด: YGOPRODeck · Scryfall · TCGdex · OPTCG API</footer></div></BrowserRouter></AuthProvider>;
}
