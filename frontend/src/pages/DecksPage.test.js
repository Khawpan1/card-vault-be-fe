import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { request } from '../api';
import { useAuth } from '../auth/AuthContext';
import DecksPage from './DecksPage';

jest.mock('../api', () => ({ request: jest.fn() }));
jest.mock('../auth/AuthContext', () => ({ useAuth: jest.fn() }));

const card = { id: 31, name: 'Blaster Blade', game: 'vanguard', type: 'Normal Unit', rarity: 'Rare', imageUrl: 'https://cdn.tcgtracking.com/product/727149_200w.jpg' };
const setName = 'BT01: Descent of the King of Knights';

afterEach(() => {
  request.mockReset();
  useAuth.mockReset();
  localStorage.clear();
});

function mockDecks({ deck, search = () => ({ items: [card], total: 1 }), saveCards = () => ({ status: 'saved' }) } = {}) {
  request.mockImplementation(async (path, options = {}) => {
    if (path === '/me/decks') return { items: deck ? [deck] : [] };
    if (path === '/cards/filters') return { sets: [setName], rarities: ['Rare'], grades: ['3'], nations: ['United Sanctuary'], clans: ['Royal Paladin'], units: ['Normal Unit'] };
    if (path.startsWith('/cards?')) return search(new URLSearchParams(path.split('?')[1]));
    if (path === '/decks' && options.method === 'POST') return { deck: { id: 12 } };
    if (path === '/decks/12' && options.method === 'PUT') return { deck: { id: 12 } };
    if (path === '/decks/12' && deck) return { deck };
    if (path === '/decks/12/cards' && options.method === 'PUT') return saveCards();
    throw new Error(`Unexpected API request: ${path}`);
  });
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<DecksPage/>}/>
    <Route path="/login" element={<h1>เข้าสู่ระบบอีกครั้ง</h1>}/>
  </Routes></MemoryRouter>);
}

test('เพิ่มการ์ดได้สูงสุด 4 ใบจากทั้งผลค้นหาและปุ่มบวก แล้วบันทึกเด็ค', async () => {
  mockDecks();
  fireEvent.click(screen.getByRole('button', { name: '+ สร้างเด็ค' }));
  fireEvent.change(screen.getByLabelText('ชื่อเด็ค'), { target: { value: 'My First Deck' } });
  fireEvent.change(screen.getByLabelText('ค้นหาชื่อการ์ด'), { target: { value: 'Blaster Blade' } });
  const addResult = await screen.findByRole('button', { name: 'Blaster Blade เพิ่มการ์ด' });
  expect(screen.getByRole('img', { name: 'Blaster Blade' })).toHaveAttribute('src', card.imageUrl);
  fireEvent.click(addResult);
  const addCopy = screen.getByRole('button', { name: 'เพิ่ม Blaster Blade' });
  for (let index = 0; index < 4; index += 1) fireEvent.click(addCopy);
  expect(addCopy).toBeDisabled();
  expect(addResult).toBeDisabled();
  fireEvent.click(addResult);
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเด็ค' }));

  await waitFor(() => expect(request).toHaveBeenCalledWith('/decks/12/cards', {
    method: 'PUT',
    body: JSON.stringify({ cards: [{ cardId: 31, quantity: 4 }] }),
  }));
});

test('กรองตามชื่อ ชุด และความหายาก พร้อมเปิดหน้าถัดไปและย้อนกลับ', async () => {
  mockDecks({ search: (query) => ({
    total: 10,
    items: query.get('offset') === '8' ? [{ ...card, id: 32, name: 'Blaster Blade (Alt Art)' }] : [card],
  }) });
  fireEvent.click(screen.getByRole('button', { name: '+ สร้างเด็ค' }));
  const searchBox = screen.getByLabelText('ค้นหาชื่อการ์ด');
  fireEvent.change(searchBox, { target: { value: 'Blaster' } });
  await screen.findByRole('option', { name: setName });
  fireEvent.change(screen.getByLabelText('ชุดการ์ด'), { target: { value: setName } });
  fireEvent.change(screen.getByLabelText('ความหายาก'), { target: { value: 'Rare' } });
  fireEvent.change(screen.getByLabelText('เกรด'), { target: { value: '3' } });
  fireEvent.change(screen.getByLabelText('เนชั่น'), { target: { value: 'United Sanctuary' } });
  fireEvent.change(screen.getByLabelText('แคลน'), { target: { value: 'Royal Paladin' } });
  fireEvent.change(screen.getByLabelText('ยูนิท'), { target: { value: 'Normal Unit' } });

  fireEvent.click(await screen.findByRole('button', { name: 'ถัดไป' }));
  expect(await screen.findByRole('button', { name: 'Blaster Blade (Alt Art) เพิ่มการ์ด' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeDisabled();
  const query = new URLSearchParams({
    game: 'vanguard', limit: '8', offset: '8', q: 'Blaster', setName, rarityExact: 'Rare',
    grade: '3', nation: 'United Sanctuary', clan: 'Royal Paladin', unit: 'Normal Unit',
  });
  expect(request).toHaveBeenCalledWith(`/cards?${query}`);

  fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }));
  await screen.findByRole('button', { name: 'Blaster Blade เพิ่มการ์ด' });
  expect(screen.getByRole('button', { name: 'ก่อนหน้า' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
  await screen.findByText('หน้า 2 / 2');
  fireEvent.change(screen.getByLabelText('ความหายาก'), { target: { value: '' } });
  expect(await screen.findByText('หน้า 1 / 2')).toBeInTheDocument();
});

test('เซสชันหมดอายุระหว่างบันทึกแล้วกู้ร่างเด็คและใช้รหัสเดิมเมื่อเข้าสู่ระบบใหม่', async () => {
  const logout = jest.fn();
  useAuth.mockReturnValue({ member: { id: 7 }, logout });
  const firstVisit = mockDecks({
    saveCards: () => { throw Object.assign(new Error('session expired'), { status: 401 }); },
  });
  fireEvent.click(screen.getByRole('button', { name: '+ สร้างเด็ค' }));
  fireEvent.change(screen.getByLabelText('ชื่อเด็ค'), { target: { value: 'My Draft' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Blaster Blade เพิ่มการ์ด' }));
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเด็ค' }));
  await screen.findByRole('heading', { name: 'เข้าสู่ระบบอีกครั้ง' });
  expect(logout).toHaveBeenCalledTimes(1);
  firstVisit.unmount();
  request.mockClear();

  mockDecks();
  expect(screen.getByLabelText('ชื่อเด็ค')).toHaveValue('My Draft');
  expect(screen.getByRole('button', { name: 'ลด Blaster Blade' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'บันทึกเด็ค' }));
  await waitFor(() => expect(request).toHaveBeenCalledWith('/decks/12/cards', {
    method: 'PUT', body: JSON.stringify({ cards: [{ cardId: 31, quantity: 1 }] }),
  }));
  expect(request).not.toHaveBeenCalledWith('/decks', expect.objectContaining({ method: 'POST' }));
  await waitFor(() => expect(localStorage.getItem('vanguard-deck-draft:7')).toBeNull());
});

test('เด็คเดิมที่เกิน 4 ใบบันทึกได้หลังลดจำนวน และส่งข้อมูลแก้ไขตามสัญญา API', async () => {
  mockDecks({ deck: { id: 12, name: 'Old Deck', cards: [{ ...card, quantity: 8 }] } });
  fireEvent.click(await screen.findByRole('button', { name: 'แก้ไข' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ลดจำนวนการ์ดที่เกิน 4 ใบ');
  const save = screen.getByRole('button', { name: 'บันทึกเด็ค' });
  expect(save).toBeDisabled();
  for (let index = 0; index < 4; index += 1) fireEvent.click(screen.getByRole('button', { name: 'ลด Blaster Blade' }));
  expect(save).toBeEnabled();
  fireEvent.click(save);

  await waitFor(() => expect(request).toHaveBeenCalledWith('/decks/12/cards', {
    method: 'PUT',
    body: JSON.stringify({ cards: [{ cardId: 31, quantity: 4 }] }),
  }));
  expect(request).toHaveBeenCalledWith('/decks/12', {
    method: 'PUT',
    body: JSON.stringify({ name: 'Old Deck', description: '', isPublic: false }),
  });
});
