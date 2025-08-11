import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { ensureProfile } from '../services/auth';

interface UseOnlineAuthState {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  error: string | null;
}

export function useOnlineAuth() {
  const [state, setState] = useState<UseOnlineAuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  // 初始化拉取当前会话，并监听会话变化
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setState(prev => ({
        ...prev,
        session: data.session ?? null,
        user: data.session?.user ?? null,
        loading: false,
        error: error ? error.message : null,
      }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        session: session ?? null,
        user: session?.user ?? null,
      }));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: displayName ? { name: displayName } : undefined },
    });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { ok: false, needsVerification: false } as const;
    }
    const user = data.user ?? data.session?.user ?? null;
    if (user) {
      await ensureProfile(user.id, displayName || user.email || 'Anonymous');
    }
    // 如果开启邮箱验证，可能无 session，需要提示用户去验证邮箱
    setState(prev => ({
      ...prev,
      session: data.session ?? prev.session,
      user: user,
      loading: false,
      error: null,
    }));
    return { ok: true, needsVerification: !data.session } as const;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { ok: false } as const;
    }
    if (data.user) {
      await ensureProfile(data.user.id, data.user.user_metadata?.name ?? data.user.email ?? 'Anonymous');
    }
    setState(prev => ({ ...prev, session: data.session ?? null, user: data.user ?? null, loading: false }));
    return { ok: true } as const;
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { ok: false } as const;
    }
    setState(prev => ({ ...prev, session: null, user: null, loading: false }));
    return { ok: true } as const;
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
  };
}


