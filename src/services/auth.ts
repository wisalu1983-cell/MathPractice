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
  // 登录时仅当元数据里显式提供 name 才更新昵称，避免覆盖已修改的昵称
  const nameFromMeta: string | undefined = user.user_metadata?.name;
  await ensureProfile(user.id, nameFromMeta, isDeveloper);
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

export async function ensureProfile(userId: string, name?: string, isDeveloper?: boolean): Promise<Profile> {
  // 先查是否存在，避免无意覆盖昵称
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (existing) {
    const updateFields: Partial<Profile> = {} as any;
    if (typeof isDeveloper === 'boolean' && existing.is_developer !== isDeveloper) {
      (updateFields as any).is_developer = isDeveloper;
    }
    if (typeof name === 'string' && name && existing.name !== name) {
      (updateFields as any).name = name;
    }
    if (Object.keys(updateFields).length === 0) return existing as Profile;
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updateFields)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (updateError) throw updateError;
    return updated as Profile;
  }

  const insertData: Partial<Profile> = {
    user_id: userId,
    name: name || 'Anonymous',
  } as any;
  if (typeof isDeveloper === 'boolean') (insertData as any).is_developer = isDeveloper;
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(insertData)
    .select('*')
    .single();
  if (insertError) throw insertError;
  return created as Profile;
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


