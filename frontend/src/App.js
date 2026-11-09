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
  return (
    <header className="border-b border-white/10 bg-vault-background">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link className="text-xl font-black tracking-wide text-vault-gold" to="/">CARD VAULT</Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm text-vault-cream/80" aria-label="เมนูหลัก">
          <NavLink to="/cards" className="hover:text-vault-gold">คลังการ์ด</NavLink>
          <NavLink to="/decks" className="hover:text-vault-gold">เด็คสาธารณะ</NavLink>
          {member ? <>
            <NavLink to="/my/decks" className="hover:text-vault-gold">เด็คของฉัน</NavLink>
            <NavLink to="/collection" className="hover:text-vault-gold">คอลเลกชัน</NavLink>
            <NavLink to="/profile" className="hover:text-vault-gold">โปรไฟล์</NavLink>
            {member.role === 'admin' && <NavLink to="/admin" className="hover:text-vault-gold">จัดการระบบ</NavLink>}
            <button className="rounded border border-vault-gold px-3 py-1 text-vault-gold" onClick={logout}>ออกจากระบบ</button>
          </> : <Link to="/login" className="rounded bg-vault-gold px-3 py-1 font-semibold text-vault-background">เข้าสู่ระบบ</Link>}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  return <main className="mx-auto max-w-7xl px-4 py-16">
    <p className="mb-3 text-sm font-semibold uppercase tracking-[.2em] text-vault-teal">Your cards, your strategy</p>
    <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">คลังการ์ดเดียว<br/><span className="text-vault-gold">จัดเด็คได้ทุกเกม</span></h1>
    <p className="mt-5 max-w-xl text-vault-cream/70">สำรวจการ์ด Yu-Gi-Oh!, Magic: The Gathering, Pokémon TCG และ One Piece พร้อมสร้างเด็คในแบบของคุณ</p>
    <Link to="/cards" className="mt-8 inline-block rounded bg-vault-orange px-5 py-3 font-bold text-white">เปิดคลังการ์ด</Link>
    <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {['Yu-Gi-Oh!', 'Magic: The Gathering', 'Pokémon TCG', 'One Piece Card Game'].map((game) => <div key={game} className="rounded-xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs uppercase text-vault-teal">Card archive</p><h2 className="mt-2 text-lg font-bold">{game}</h2></div>)}
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
