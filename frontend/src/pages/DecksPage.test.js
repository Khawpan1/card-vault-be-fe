import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { request } from '../api';
import DecksPage from './DecksPage';

jest.mock('../api', () => ({ request: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ member: { id: 7, role: 'member' } })
}));

afterEach(() => jest.clearAllMocks());

test('สร้างเด็ค ค้นการ์ด เพิ่มลงเด็ค และส่งรายการไป Backend', async () => {
  const card = { id: 31, name: 'Dark Magician', game: 'yugioh', type: 'Spellcaster', rarity: 'Ultra Rare', imageUrl: 'https://cards.example/dark-magician.jpg' };
  request.mockImplementation((path, options = {}) => {
    if (path === '/me/decks') return Promise.resolve({ items: [] });
    if (path.startsWith('/cards?')) return Promise.resolve({ items: [card] });
    if (path === '/decks' && options.method === 'POST') return Promise.resolve({ deck: { id: 12 } });
    if (path === '/decks/12/cards' && options.method === 'PUT') return Promise.resolve({ status: 'saved' });
    return Promise.reject(new Error(`Unexpected API request: ${path}`));
  });

  render(<MemoryRouter><DecksPage/></MemoryRouter>);
  await screen.findByText('ยังไม่มีเด็ค เริ่มสร้างเด็คแรกของคุณได้เลย');
  fireEvent.click(screen.getByRole('button', { name: '+ สร้างเด็ค' }));
  fireEvent.change(screen.getByLabelText('ชื่อเด็ค'), { target: { value: 'My First Deck' } });
  fireEvent.change(screen.getByPlaceholderText('ค้นการ์ดในเกมที่เลือกเพื่อเพิ่ม…'), { target: { value: 'Dark Magician' } });
  expect(await screen.findByRole('img', { name: 'Dark Magician' })).toHaveAttribute('src', card.imageUrl);
  fireEvent.click(await screen.findByRole('button', { name: /Dark Magician เพิ่มการ์ด/ }));
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเด็ค' }));

  await waitFor(() => expect(request).toHaveBeenCalledWith('/decks/12/cards', {
    method: 'PUT',
    body: JSON.stringify({ cards: [{ cardId: 31, quantity: 1 }] })
  }));
  expect(request).toHaveBeenCalledWith('/decks', expect.objectContaining({ method: 'POST' }));
});
