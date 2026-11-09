const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

export async function request(path, options = {}) {
  // แนบตั๋วจากการล็อกอินให้ Backend ตรวจสิทธิ์
  const token = localStorage.getItem('cardVaultToken');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
  }
  return body;
}
