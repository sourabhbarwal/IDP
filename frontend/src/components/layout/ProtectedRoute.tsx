import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { RealtimeProvider } from '../../context/RealtimeContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAppSelector((s) => s.auth);
  return user
    ? <RealtimeProvider>{children}</RealtimeProvider>
    : <Navigate to="/login" replace />;
}