import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppSelector((s) => s.auth);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}
