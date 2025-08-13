import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { ensureProfile } from '../services/auth';

interface UseOnlineAuthState {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  error: string | null;
  isDeveloper: boolean;
  recentEmails: string[];
}

export function useOnlineAuth() {
  const [state, setState] = useState<UseOnlineAuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
    isDeveloper: false,
    recentEmails: [],
  });

  // 初始化拉取当前会话，并监听会话变化
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      const email = data.session?.user?.email || '';
      const isDev = !!email && email.toLowerCase().endsWith('@whosyour.daddy');
      setState(prev => ({
        ...prev,
        session: data.session ?? null,
        user: data.session?.user ?? null,
        loading: false,
        error: error ? error.message : null,
        isDeveloper: isDev,
        recentEmails: loadRecentEmails(),
      }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || '';
      const isDev = !!email && email.toLowerCase().endsWith('@whosyour.daddy');
      if (email && !isDev) {
        saveRecentEmail(email);
      }
      setState(prev => ({
        ...prev,
        session: session ?? null,
        user: session?.user ?? null,
        isDeveloper: isDev,
        recentEmails: loadRecentEmails(),
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
      const isDev = !!user.email && user.email.toLowerCase().endsWith('@whosyour.daddy');
      await ensureProfile(user.id, displayName || user.email || 'Anonymous', isDev);
      if (user.email && !isDev) saveRecentEmail(user.email);
    }
    // 如果开启邮箱验证，可能无 session，需要提示用户去验证邮箱
    setState(prev => ({
      ...prev,
      session: data.session ?? prev.session,
      user: user,
      loading: false,
      error: null,
      isDeveloper: !!(user?.email) && user.email!.toLowerCase().endsWith('@whosyour.daddy'),
      recentEmails: loadRecentEmails(),
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
      const isDev = !!data.user.email && data.user.email.toLowerCase().endsWith('@whosyour.daddy');
      // 登录时仅在元数据包含 name 时更新昵称，避免覆盖已修改的昵称
      const nameFromMeta: string | undefined = data.user.user_metadata?.name;
      await ensureProfile(data.user.id, nameFromMeta, isDev);
      if (data.user.email && !isDev) saveRecentEmail(data.user.email);
    }
    setState(prev => ({
      ...prev,
      session: data.session ?? null,
      user: data.user ?? null,
      loading: false,
      isDeveloper: !!(data.user?.email) && data.user!.email!.toLowerCase().endsWith('@whosyour.daddy'),
      recentEmails: loadRecentEmails(),
    }));
    return { ok: true } as const;
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      return { ok: false } as const;
    }
    setState(prev => ({ ...prev, session: null, user: null, loading: false, isDeveloper: false }));
    return { ok: true } as const;
  }, []);

  return {
    ...state,
    signUp,
    signIn,
    signOut,
  };
}

// 最近登录邮箱列表（仅普通账号，排除开发者域名）
const RECENT_EMAILS_KEY = 'recent_logins';
function loadRecentEmails(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMAILS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // 过滤掉开发者邮箱，最多5条
    return arr.filter((e: string) => typeof e === 'string' && !e.toLowerCase().endsWith('@whosyour.daddy')).slice(0, 5);
  } catch {
    return [];
  }
}
function saveRecentEmail(email: string) {
  const e = (email || '').toLowerCase();
  if (!e || e.endsWith('@whosyour.daddy')) return;
  const list = loadRecentEmails();
  const next = [e, ...list.filter(x => x !== e)].slice(0, 5);
  localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(next));
}


