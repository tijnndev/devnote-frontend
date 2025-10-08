import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/auth';
import { EditorPanel } from './editor/EditorPanel';
import { NavigationPanel } from './navigation/NavigationPanel';

export function AppLayout() {
  const clearApiKey = useAuthStore((state) => state.clearApiKey);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    clearApiKey();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">DevNote</p>
          <h1 className="text-xl font-semibold">Workspace</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Log out
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <NavigationPanel />
        <EditorPanel />
      </div>
    </div>
  );
}