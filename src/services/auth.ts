import { supabase } from '../lib/supabase';
import type { Profile } from '../types/supabase';

export interface AuthResult {
  userId: string;
  email: string | null;
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { name: displayName } : undefined,
    },
  });

  if (error) throw error;

  const user = data.user ?? data.session?.user;
  if (!user) {
    // 若开启了邮件验证，此时可能无 session，这里返回 userId 为占位
    return { userId: data.user?.id ?? '', email: email ?? null };
  }

  const isDeveloper = !!user.email && user.email.toLowerCase().endsWith('@whosyour.daddy');
  await ensureProfile(user.id, displayName ?? user.email ?? 'Anonymous', isDeveloper);
  return { userId: user.id, email: user.email };
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('登录失败：未获取到用户信息');

  const isDeveloper = !!user.email && user.email.toLowerCase().endsWith('@whosyour.daddy');
  await ensureProfile(user.id, user.user_metadata?.name ?? user.email ?? 'Anonymous', isDeveloper);
  return { userId: user.id, email: user.email };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function ensureProfile(userId: string, name: string, isDeveloper?: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        name,
        ...(typeof isDeveloper === 'boolean' ? { is_developer: isDeveloper } : {}),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfileName(userId: string, name: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}


