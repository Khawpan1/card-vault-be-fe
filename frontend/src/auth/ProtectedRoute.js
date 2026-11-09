import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ admin = false }) {
  const { member, ready } = useAuth();
  if (!ready) return <p className="p-8 text-center">กำลังตรวจสอบบัญชี…</p>;
  if (!member) return <Navigate to="/login" replace/>;
  if (admin && member.role !== 'admin') return <Navigate to="/" replace/>;
  return <Outlet/>;
}
