export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export async function request(path, options = {}) {
  // แนบตั๋วจากการล็อกอินให้ Backend ตรวจสิทธิ์
  const token = localStorage.getItem('cardVaultToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    error.status = response.status;
    throw error;
  }
  return body;
}
