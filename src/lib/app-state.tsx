import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { backend, Session } from './backend';
import { onDemoChange } from './backend/demo';
import type { Profile } from './types';

interface AppState {
  ready: boolean;
  session: Session | null;
  me: Profile | null;
  saved: Set<string>;
  /** bumps whenever data may have changed; screens re-fetch on change */
  tick: number;
  refresh: () => void;
  reloadMe: () => Promise<void>;
  toggleSaved: (listingId: string) => Promise<void>;
  /** returns true if logged in, otherwise sends the user to login */
  requireLogin: () => boolean;
}

const Ctx = createContext<AppState>(null as unknown as AppState);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const sessionRef = useRef<Session | null>(null);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  const loadFor = useCallback(async (s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
    if (s) {
      const [p, ids] = await Promise.all([backend.getProfile(s.userId), backend.savedIds()]);
      setMe(p);
      setSaved(new Set(ids));
    } else {
      setMe(null);
      setSaved(new Set());
    }
  }, []);

  useEffect(() => {
    backend.getSession().then(loadFor).finally(() => setReady(true));
    const off = backend.onAuthChange(s => { loadFor(s); refresh(); });
    const offDemo = backend.mode === 'demo' ? onDemoChange(refresh) : () => {};
    return () => { off(); offDemo(); };
  }, [loadFor, refresh]);

  // Real backend: refresh lists every 20s so timers/offers stay current.
  useEffect(() => {
    if (backend.mode !== 'supabase') return;
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const reloadMe = useCallback(async () => {
    if (sessionRef.current) setMe(await backend.getProfile(sessionRef.current.userId));
  }, []);

  const requireLogin = useCallback(() => {
    if (sessionRef.current) return true;
    router.push('/login');
    return false;
  }, []);

  const toggleSaved = useCallback(async (id: string) => {
    if (!requireLogin()) return;
    const on = await backend.toggleSaved(id);
    setSaved(prev => {
      const n = new Set(prev);
      on ? n.add(id) : n.delete(id);
      return n;
    });
  }, [requireLogin]);

  return (
    <Ctx.Provider value={{ ready, session, me, saved, tick, refresh, reloadMe, toggleSaved, requireLogin }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);

/** Small data hook: runs `fn` on mount and whenever deps or the global tick change. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const { tick } = useApp();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    try {
      setError(null);
      setData(await fn());
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run, tick]);
  return { data, error, loading, reload: run, setData };
}
