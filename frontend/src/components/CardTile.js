import { Link } from 'react-router-dom';
import { cardImageUrl, handleCardImageError } from '../cardImage';

export default function CardTile({ card }) {
  return <article className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] shadow-lg shadow-black/10">
    <Link to={`/cards/${card.id}`} className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-vault-gold">
      <div className="overflow-hidden bg-white/[.05]"><img src={cardImageUrl(card)} onError={handleCardImageError} alt={card.name} loading="lazy" className="aspect-[3/4] w-full object-contain"/></div>
      <div className="p-3.5">
        <p className="line-clamp-1 font-bold leading-snug group-hover:text-vault-gold">{card.name}</p>
        <p className="mt-1.5 line-clamp-1 text-xs text-vault-cream/60">{card.type}</p>
        <p className="mt-3 inline-flex rounded-full border border-vault-gold/25 bg-vault-gold/10 px-2.5 py-1 text-[11px] font-semibold text-vault-gold">{card.rarity}</p>
      </div>
    </Link>
  </article>;
}
