import { Link } from 'react-router-dom';

export default function CardTile({ card }) {
  return <article className="overflow-hidden rounded-xl border border-white/10 bg-white/[.04]">
    <Link to={`/cards/${card.id}`} className="block">
      <img src={card.imageUrl} alt={card.name} loading="lazy" className="aspect-[3/4] w-full bg-black/30 object-contain"/>
      <div className="p-3">
        <p className="line-clamp-1 font-bold">{card.name}</p>
        <p className="mt-1 line-clamp-1 text-xs text-vault-cream/60">{card.type}</p>
        <p className="mt-2 text-xs font-semibold text-vault-gold">{card.rarity}</p>
      </div>
    </Link>
  </article>;
}
