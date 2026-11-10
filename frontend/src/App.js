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

const homeGames = [
  { id: 'yugioh', name: 'Yu-Gi-Oh!', mark: 'DUEL', detail: 'ค้นหาการ์ดและสร้างเด็ค', color: 'from-[#8c3f20] to-[#331c2e]', edge: 'border-vault-orange/40', imageUrl: 'https://www.konami.com/yugioh/assets/images/mainvisual/yugikaiba-pc.webp', sourceUrl: 'https://www.konami.com/yugioh/' },
  { id: 'mtg', name: 'Magic: The Gathering', mark: 'MTG', detail: 'สำรวจการ์ดจากหลายสี', color: 'from-[#365d58] to-[#1b2535]', edge: 'border-vault-teal/40', imageUrl: 'https://images.ctfassets.net/s5n2t79q9icq/7kryiegbYrwL91aijourES/1970bc51ea02bdb38e2049a11217c976/vbsoasdbnd8383_1920x700.png?q=80&w=1920&h=700&fit=crop&f=center&fm=webp', sourceUrl: 'https://magic.wizards.com/en' },
  { id: 'pokemon', name: 'Pokémon TCG', mark: 'POKÉMON', detail: 'ค้นหาการ์ดโปเกมอน', color: 'from-[#9a7425] to-[#3d2832]', edge: 'border-vault-gold/50', imageUrl: 'https://tcg.pokemon.com/assets/img/home/tcgl/pikachu-2x.png', sourceUrl: 'https://tcg.pokemon.com/en-us/' },
  { id: 'onepiece', name: 'One Piece Card Game', mark: 'ONE PIECE', detail: 'รวมพลการ์ดโจรสลัด', color: 'from-[#315476] to-[#292044]', edge: 'border-sky-300/40', imageUrl: 'https://en.onepiece-cardgame.com/onepiececg/bccard/en/banner/2026/07/15/XYfefkzZmrEkoKvM/st36_mv.webp', sourceUrl: 'https://en.onepiece-cardgame.com/' }
];

function HomePage() {
  const games = homeGames;
  return <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
    <section className="mx-auto max-w-3xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-vault-gold/30 bg-vault-gold/[.08] px-4 py-2 text-xs font-bold tracking-wide text-vault-gold"><span aria-hidden="true">✦</span> CARD VAULT · คลังการ์ด</span>
      <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">เลือกเกมที่คุณชอบ</h1>
      <p className="mx-auto mt-4 max-w-2xl leading-7 text-vault-cream/65">ค้นหาการ์ด ดูรายละเอียด และจัดเด็คจากคลังเดียว</p>
    </section>
    <section aria-label="เลือกเกมการ์ด" className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
      {games.map((game) => <Link key={game.id} to={`/cards?game=${game.id}`} className={`group relative isolate aspect-[4/5] overflow-hidden rounded-2xl border ${game.edge} bg-gradient-to-br ${game.color} shadow-xl shadow-black/20 focus:outline-none focus:ring-2 focus:ring-vault-gold`}>
        <img src={game.imageUrl} alt={`ภาพโปรโมต ${game.name} จากเว็บไซต์ทางการ`} loading="lazy" className="absolute inset-0 -z-10 h-full w-full bg-black/20 object-cover transition-transform duration-300 group-hover:scale-105"/>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/35 to-black/10"/>
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
          <div className="min-w-0"><p className="text-[11px] font-semibold tracking-[.2em] text-white/80">CARD DATABASE</p><h2 className="mt-3 text-xl font-black leading-snug text-white sm:text-2xl">{game.name}</h2><p className="mt-3 text-sm font-semibold text-white/85">{game.detail}</p></div>
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-xl text-white ring-1 ring-white/20 group-hover:bg-vault-gold group-hover:text-vault-background">→</span>
        </div>
      </Link>)}
    </section>
    <p className="mt-5 text-center text-xs text-vault-cream/40">ภาพโปรโมตจากเว็บไซต์ทางการ:{' '}{games.map((game, index) => <span key={game.id}><a href={game.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-vault-cream">{game.name}</a>{index < games.length - 1 ? ' · ' : ''}</span>)}</p>
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
