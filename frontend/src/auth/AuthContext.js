import { createContext, useContext, useEffect, useState } from 'react';
import { request } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [member, setMember] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cardVaultToken')) { setReady(true); return; }
    request('/me').then((data) => setMember(data.member)).catch(() => {
      localStorage.removeItem('cardVaultToken');
    }).finally(() => setReady(true));
  }, []);

  async function login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('cardVaultToken', data.token);
    setMember(data.member);
  }
  async function register(displayName, email, password) {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify({ displayName, email, password }) });
    localStorage.setItem('cardVaultToken', data.token);
    setMember(data.member);
  }
  function logout() {
    localStorage.removeItem('cardVaultToken');
    setMember(null);
  }

  return <AuthContext.Provider value={{ member, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
