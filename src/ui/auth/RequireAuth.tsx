import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '../../store/auth';

type RequireAuthProps = {
  children: JSX.Element;
};

const envApiKey = import.meta.env.VITE_API_KEY;

export function RequireAuth({ children }: RequireAuthProps) {
  const apiKey = useAuthStore((state) => state.apiKey);
  const location = useLocation();

  if (apiKey && envApiKey) {
    return children;
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
}
