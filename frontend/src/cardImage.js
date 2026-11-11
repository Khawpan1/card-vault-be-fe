const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

// รูปจาก PokéWallet ต้องแนบ API key จึงโหลดผ่าน Backend ที่เก็บ key ไว้ฝั่งเซิร์ฟเวอร์
export function cardImageUrl(card) {
  return `${API_URL}/cards/${card.id}/image`;
}

const missingImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" fill="#1A1423"/><rect x="14" y="14" width="272" height="392" rx="18" fill="none" stroke="#D4AF37" stroke-width="3"/><circle cx="150" cy="170" r="58" fill="none" stroke="#5BC0BE" stroke-width="5"/><path d="M98 170h104M150 118v104" stroke="#D4AF37" stroke-width="5"/><text x="150" y="290" fill="#F8F1E5" font-family="sans-serif" font-size="18" text-anchor="middle">VANGUARD CARD</text></svg>')}`;

export function handleCardImageError(event) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = missingImage;
}
