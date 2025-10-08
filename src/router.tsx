import { Navigate, createBrowserRouter } from 'react-router-dom';

import { AppLayout } from './ui/AppLayout';
import { LoginPage } from './ui/auth/LoginPage';
import { RequireAuth } from './ui/auth/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    )
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);