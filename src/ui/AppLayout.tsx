import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import { useAuthStore } from '../store/auth';
import { EditorPanel } from './editor/EditorPanel';
import { NavigationPanel } from './navigation/NavigationPanel';

export function AppLayout() {
  const clearApiKey = useAuthStore((state) => state.clearApiKey);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const openMobileNav = () => {
    setMobileNavOpen(true);
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  const handleLogout = () => {
    clearApiKey();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openMobileNav}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-200 transition hover:bg-slate-800 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-xs uppercase tracking-wide text-slate-500">DevNote</p>
          <h1 className="text-lg font-semibold sm:text-xl">Workspace</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800 sm:text-sm"
        >
          Log out
        </button>
      </header>
      <div className="relative flex flex-1 overflow-hidden">
        <NavigationPanel className="hidden md:flex" />
        <EditorPanel />
        {mobileNavOpen ? (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/70"
              onClick={closeMobileNav}
              aria-label="Close navigation overlay"
            />
            <NavigationPanel
              className="relative h-full w-72 max-w-[85vw] border-r border-slate-800 bg-slate-950 shadow-2xl"
              onClose={closeMobileNav}
            />
            <button
              type="button"
              onClick={closeMobileNav}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 shadow"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}