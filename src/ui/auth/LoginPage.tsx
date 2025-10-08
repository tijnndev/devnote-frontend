import { type FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Location, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const envApiKey = import.meta.env.VITE_API_KEY;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const storeApiKey = useAuthStore((state) => state.apiKey);
  const setApiKey = useAuthStore((state) => state.setApiKey);

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const redirectPath = (location.state as { from?: Location })?.from?.pathname ?? '/';

  useEffect(() => {
    if (storeApiKey && envApiKey) {
      navigate('/', { replace: true });
    }
  }, [storeApiKey, navigate]);

  const validateMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      await api.get('/health', {
        headers: {
          'x-api-key': apiKey
        }
      });
    },
    onSuccess: () => {
      queryClient.clear();
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setError('Please enter your API key.');
      return;
    }
    setError(null);
    void validateMutation
      .mutateAsync(trimmed)
      .then(() => {
        setApiKey(trimmed);
        navigate(redirectPath, { replace: true });
      })
      .catch((err) => {
        console.error('Failed to validate API key', err);
        setError('Authentication failed. Check your API key and try again.');
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg">
        <h1 className="text-2xl font-semibold">Sign in to DevNote</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the API key configured on your DevNote backend to continue.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-300">
            API key
            <input
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="sk_live_..."
              autoFocus
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {envApiKey ? (
            <p className="text-xs text-slate-500">
              Using build-time API key from environment. You can still override it here.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={validateMutation.isPending}
            className="flex w-full items-center justify-center rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {validateMutation.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
