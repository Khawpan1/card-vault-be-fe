import { API_URL } from './api';

export function cardImageUrl(card) {
  if (card.imageUrl?.startsWith('https://api.pokewallet.io/cfv/images/')) {
    return `${API_URL}/cards/${card.id}/image`;
  }
  return card.imageUrl || missingImage;
}

const missingImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#F2EFE9"/><rect x="14" y="14" width="272" height="392" rx="18" fill="none" stroke="#805509" stroke-width="3"/><circle cx="150" cy="170" r="58" fill="none" stroke="#19665D" stroke-width="5"/><path d="M98 170h104M150 118v104" stroke="#805509" stroke-width="5"/><text x="150" y="290" fill="#25212A" font-family="sans-serif" font-size="18" text-anchor="middle">VANGUARD CARD</text></svg>')}`;

export function handleCardImageError(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = missingImage;
}
