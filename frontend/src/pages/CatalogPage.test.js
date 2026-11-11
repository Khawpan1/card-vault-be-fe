import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { request } from '../api';
import CatalogPage from './CatalogPage';

jest.mock('../api', () => ({ request: jest.fn() }));

function renderCatalog() {
  return render(<MemoryRouter><CatalogPage/></MemoryRouter>);
}

const filterOptions = { sets: ['BT01: Descent of the King of Knights'], rarities: ['Rare', 'Triple Rare'] };
const exampleCard = { id: 9, name: 'Hellfire Dragon Emperor', game: 'vanguard', type: 'Normal Unit', rarity: 'RRR', imageUrl: '' };

function mockCatalog(loadCards = async () => ({ items: [], total: 0 })) {
  request.mockImplementation((path) => path === '/cards/filters' ? Promise.resolve(filterOptions) : loadCards(path));
}

afterEach(() => request.mockReset());

test('แสดง Loading แล้วแสดงการ์ดที่ API ส่งกลับ', async () => {
  mockCatalog(async () => ({ items: [exampleCard], total: 1 }));
  renderCatalog();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByText('Hellfire Dragon Emperor')).toBeInTheDocument();
  expect(screen.getByText(/1 ใบ/)).toBeInTheDocument();
});

test('แสดง Empty เมื่อค้นหาแล้วไม่มีการ์ด', async () => {
  mockCatalog();
  renderCatalog();
  expect(await screen.findByText('ไม่พบข้อมูลที่ตรงกับการค้นหา')).toBeInTheDocument();
});

test('แสดง Error และให้ลองโหลดใหม่ได้', async () => {
  const loadCards = jest.fn().mockRejectedValueOnce(new Error('API ใช้งานไม่ได้')).mockResolvedValueOnce({ items: [], total: 0 });
  mockCatalog(loadCards);
  renderCatalog();
  expect(await screen.findByRole('alert')).toHaveTextContent('API ใช้งานไม่ได้');
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  await waitFor(() => expect(screen.getByText('ไม่พบข้อมูลที่ตรงกับการค้นหา')).toBeInTheDocument());
});

test('เลือกชุดการ์ดและความหายากจากรายการพร้อมกลับมาหน้าแรก', async () => {
  const [setName] = filterOptions.sets;
  mockCatalog(async (path) => {
    const query = new URLSearchParams(path.split('?')[1]);
    return { items: [exampleCard], total: query.has('setName') ? 1 : 48 };
  });
  renderCatalog();
  fireEvent.click(await screen.findByRole('button', { name: 'ถัดไป' }));
  expect(await screen.findByText('หน้า 2 / 2')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('combobox', { name: 'ชุดการ์ด' }), { target: { value: setName } });
  fireEvent.change(screen.getByRole('combobox', { name: 'ความหายาก' }), { target: { value: 'Rare' } });

  const query = new URLSearchParams({ game: 'vanguard', limit: '24', offset: '0', setName, rarityExact: 'Rare' });
  await waitFor(() => expect(request).toHaveBeenCalledWith(`/cards?${query}`));
  expect(await screen.findByText(/1 ใบ/)).toBeInTheDocument();
});
