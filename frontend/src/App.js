import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { request } from './api';
import { ErrorMessage } from './components/LoadState';
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

const homeGames = [
  { id: 'yugioh', name: 'Yu-Gi-Oh!', mark: 'DUEL', detail: 'ค้นหาการ์ดและสร้างเด็ค', color: 'from-[#8c3f20] to-[#331c2e]', edge: 'border-vault-orange/40' },
  { id: 'mtg', name: 'Magic: The Gathering', mark: 'MTG', detail: 'สำรวจการ์ดจากหลายสี', color: 'from-[#365d58] to-[#1b2535]', edge: 'border-vault-teal/40' },
  { id: 'pokemon', name: 'Pokémon TCG', mark: 'POKÉMON', detail: 'ค้นหาการ์ดโปเกมอน', color: 'from-[#9a7425] to-[#3d2832]', edge: 'border-vault-gold/50' },
  { id: 'onepiece', name: 'One Piece Card Game', mark: 'ONE PIECE', detail: 'รวมพลการ์ดโจรสลัด', color: 'from-[#315476] to-[#292044]', edge: 'border-sky-300/40' }
];

function HomePage() {
  const [covers, setCovers] = useState({});
  const [coverError, setCoverError] = useState('');
  const [coverLoading, setCoverLoading] = useState(true);
  const games = homeGames;
  const loadCovers = useCallback(async () => {
    setCoverLoading(true); setCoverError('');
    const results = await Promise.allSettled(games.map(async (game) => {
      const data = await request(`/cards?game=${game.id}&limit=8`);
      return [game.id, data.items?.find((card) => card.imageUrl)?.imageUrl || ''];
    }));
    const images = Object.fromEntries(results.filter((result) => result.status === 'fulfilled').map((result) => result.value));
    setCovers(images);
    if (Object.keys(images).length === 0) setCoverError('โหลดรูปการ์ดไม่สำเร็จ');
    setCoverLoading(false);
  }, []);
  useEffect(() => { loadCovers(); }, [loadCovers]);
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
    <section className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-vault-gold/30 bg-vault-gold/[.08] px-4 py-2 text-xs font-bold tracking-wide text-vault-gold"><span aria-hidden="true">✦</span> CARD VAULT · คลังการ์ด</span>
      <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">เลือกเกมที่คุณชอบ</h1>
      <p className="mx-auto mt-4 max-w-2xl leading-7 text-vault-cream/65">ค้นหาการ์ด ดูรายละเอียด และจัดเด็คจากคลังเดียว</p>
    </section>
    {coverError && <ErrorMessage message={coverError} onRetry={loadCovers}/>}
    {coverLoading && <p role="status" className="mt-8 text-center text-sm text-vault-teal">กำลังโหลดภาพการ์ด…</p>}
    <section aria-label="เลือกเกมการ์ด" className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
      {games.map((game, index) => <Link key={game.id} to={`/cards?game=${game.id}`} className={`group flex min-h-72 flex-col overflow-hidden rounded-2xl border ${game.edge} bg-gradient-to-br ${game.color} shadow-xl shadow-black/15 focus:outline-none focus:ring-2 focus:ring-vault-gold`}>
        <div className="relative h-44 overflow-hidden bg-black/25">
          {covers[game.id] && <img src={covers[game.id]} alt={`${game.name} ตัวอย่างภาพการ์ด`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/>}
          {!covers[game.id] && <div aria-hidden="true" className={`h-full w-full bg-gradient-to-br ${game.color}`}><div className="mx-auto mt-5 h-36 w-28 rotate-[-5deg] rounded-xl border border-white/20 bg-white/[.08] shadow-xl"/></div>}
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20"/>
          <div className="absolute inset-x-4 top-4 flex items-center justify-between"><span className="rounded-full border border-white/25 bg-black/35 px-3 py-1 text-[10px] font-bold tracking-[.16em] text-white">0{index + 1} · {game.mark}</span><span aria-hidden="true" className="text-xl text-white">↗</span></div>
        </div>
        <div className="flex flex-1 flex-col items-start p-5">
          <h2 className="text-lg font-black leading-snug text-white">{game.name}</h2><p className="mt-1 text-sm text-white/70">{game.detail}</p>
          <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-vault-gold">เปิดคลังการ์ด <span aria-hidden="true">→</span></span>
        </div>
      </Link>)}
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
  </Routes><footer className="mt-16 border-t border-white/10 px-4 py-6 text-center text-xs text-vault-cream/50">ข้อมูลการ์ด: YGOPRODeck · Scryfall · TCGdex · OPTCG API</footer></div></BrowserRouter></AuthProvider>;
}
