import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { request } from '../api';
import CatalogPage from './CatalogPage';

jest.mock('../api', () => ({ request: jest.fn() }));

function renderCatalog() {
  return render(<MemoryRouter><CatalogPage/></MemoryRouter>);
}

afterEach(() => jest.clearAllMocks());

test('แสดง Loading แล้วแสดงการ์ดที่ API ส่งกลับ', async () => {
  request.mockResolvedValue({ items: [{ id: 9, name: 'Blue-Eyes White Dragon', game: 'yugioh', type: 'Dragon', rarity: 'Ultra Rare', imageUrl: 'https://cards.example/blue-eyes.jpg' }], total: 1 });
  renderCatalog();
  expect(screen.getByRole('status')).toHaveTextContent('กำลังโหลด');
  expect(await screen.findByText('Blue-Eyes White Dragon')).toBeInTheDocument();
  expect(screen.getByText(/1 ใบ/)).toBeInTheDocument();
});

test('แสดง Empty เมื่อค้นหาแล้วไม่มีการ์ด', async () => {
  request.mockResolvedValue({ items: [], total: 0 });
  renderCatalog();
  expect(await screen.findByText('ไม่พบข้อมูลที่ตรงกับการค้นหา')).toBeInTheDocument();
});

test('แสดง Error และให้ลองโหลดใหม่ได้', async () => {
  request.mockRejectedValueOnce(new Error('API ใช้งานไม่ได้')).mockResolvedValueOnce({ items: [], total: 0 });
  renderCatalog();
  expect(await screen.findByRole('alert')).toHaveTextContent('API ใช้งานไม่ได้');
  fireEvent.click(screen.getByRole('button', { name: 'ลองอีกครั้ง' }));
  await waitFor(() => expect(screen.getByText('ไม่พบข้อมูลที่ตรงกับการค้นหา')).toBeInTheDocument());
});
