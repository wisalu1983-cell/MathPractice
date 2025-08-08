import { supabase } from '../lib/supabase';

/**
 * 测试 Supabase 连接和配置
 */
export async function testSupabaseConnection() {
  try {
    console.log('🔍 测试 Supabase 连接...');
    
    // 1. 测试基本连接
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase 连接失败:', error.message);
      return false;
    }
    
    console.log('✅ Supabase 连接成功');
    console.log(`📊 profiles 表当前有 ${data?.length || 0} 条记录`);
    
    // 2. 测试认证状态
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔐 当前认证状态:', session ? '已登录' : '未登录');
    
    // 3. 测试 history_records 表
    const { data: historyData, error: historyError } = await supabase
      .from('history_records')
      .select('count', { count: 'exact', head: true });
    
    if (historyError) {
      console.error('❌ history_records 表访问失败:', historyError.message);
      return false;
    }
    
    console.log(`📊 history_records 表当前有 ${historyData?.length || 0} 条记录`);
    
    console.log('🎉 所有 Supabase 功能测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    return false;
  }
}

/**
 * 测试用户注册功能（仅测试，不会真正注册）
 */
export async function testUserRegistration(email: string, password: string) {
  try {
    console.log('🧪 测试用户注册流程...');
    
    // 这里只是模拟测试，不会真正注册
    console.log(`📧 模拟注册邮箱: ${email}`);
    console.log('🔑 密码长度:', password.length);
    
    if (password.length < 6) {
      console.warn('⚠️ 密码长度至少需要 6 位');
      return false;
    }
    
    console.log('✅ 注册参数验证通过');
    return true;
    
  } catch (error) {
    console.error('❌ 注册测试失败:', error);
    return false;
  }
}

/**
 * 检查环境变量配置
 */
export function checkEnvironmentConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.log('🔧 检查环境配置...');
  
  if (!supabaseUrl) {
    console.error('❌ 缺少 VITE_SUPABASE_URL 环境变量');
    return false;
  }
  
  if (!supabaseKey) {
    console.error('❌ 缺少 VITE_SUPABASE_ANON_KEY 环境变量');
    return false;
  }
  
  console.log('✅ Supabase URL 已配置:', supabaseUrl);
  console.log('✅ Supabase Key 已配置 (长度:', supabaseKey.length, '字符)');
  
  return true;
}
