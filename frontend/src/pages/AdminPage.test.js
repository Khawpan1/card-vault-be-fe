import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { request } from '../api';
import AdminPage from './AdminPage';

jest.mock('../api', () => ({ request: jest.fn() }));

test('หน้าเด็คสาธารณะของ Admin แบ่งหน้าและเปิดรายละเอียดเด็คได้', async () => {
  request.mockImplementation(async (path) => {
    if (path === '/admin/decks?limit=20&offset=0') return { items: [{ id: 1, name: 'Deck A' }], total: 21 };
    if (path === '/admin/decks?limit=20&offset=20') return { items: [{ id: 21, name: 'Deck B' }], total: 21 };
    throw new Error(`Unexpected API request: ${path}`);
  });
  render(<MemoryRouter initialEntries={['/admin/decks']}><Routes>
    <Route path="/admin/:section" element={<AdminPage/>}/>
  </Routes></MemoryRouter>);
  expect(await screen.findByText('Deck A')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }));
  expect(await screen.findByText('Deck B')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'ดูรายละเอียดเด็ค' })).toHaveAttribute('href', '/decks/21');
  expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'ก่อนหน้า' }));
  expect(await screen.findByText('Deck A')).toBeInTheDocument();
});
