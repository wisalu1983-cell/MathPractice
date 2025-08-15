-- Supabase 数据库表创建脚本
-- 请在 Supabase 控制台的 SQL Editor 中执行此脚本

-- 1. 创建 profiles 表（用户资料表）
-- 此表与 auth.users 表关联，存储用户的显示信息
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_developer BOOLEAN NOT NULL DEFAULT FALSE
);

-- 启用 profiles 表的 RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles 表的 RLS 策略
CREATE POLICY "用户可以查看自己的资料"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的资料"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的资料"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. 创建 history_records 表（历史记录表）
-- 存储用户的数学练习历史记录
CREATE TABLE IF NOT EXISTS public.history_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  problem_type TEXT NOT NULL CHECK (problem_type IN ('mental','written','mixed','properties')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic','challenge')),
  total_problems INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  accuracy NUMERIC NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100), -- 0-100 的百分比
  total_time INTEGER NOT NULL, -- 总时间（秒）
  average_time NUMERIC NOT NULL, -- 平均时间（秒）
  problems JSONB NOT NULL, -- 存储 Problem[] 数组
  answers JSONB NOT NULL, -- 存储 (string|number)[] 数组
  answer_times JSONB NOT NULL, -- 存储 number[] 数组（每道题的答题时间）
  score INTEGER NOT NULL,
  client_id TEXT -- 可选：客户端生成的去重ID（如本地记录ID或 sessionId）
);

-- 启用 history_records 表的 RLS
ALTER TABLE public.history_records ENABLE ROW LEVEL SECURITY;

-- history_records 表的 RLS 策略
CREATE POLICY "用户可以查看自己的历史记录"
  ON public.history_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的历史记录"
  ON public.history_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的历史记录"
  ON public.history_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的历史记录"
  ON public.history_records FOR DELETE
  USING (auth.uid() = user_id);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_history_records_user_id ON public.history_records(user_id);
CREATE INDEX IF NOT EXISTS idx_history_records_date ON public.history_records(date);
CREATE INDEX IF NOT EXISTS idx_history_records_problem_type ON public.history_records(problem_type);
CREATE INDEX IF NOT EXISTS idx_history_records_difficulty ON public.history_records(difficulty);
-- 基于 user_id + client_id 的唯一约束，便于多设备/离线去重合并
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'uniq_history_user_client'
  ) THEN
    CREATE UNIQUE INDEX uniq_history_user_client 
      ON public.history_records(user_id, client_id) 
      WHERE client_id IS NOT NULL;
  END IF;
END $$;

-- 添加约束确保 client_id 不为空（对于新记录）
-- 这有助于防止数据完整性问题
DO $$
BEGIN
  -- 检查约束是否已存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'chk_history_client_id_not_empty'
  ) THEN
    ALTER TABLE public.history_records 
    ADD CONSTRAINT chk_history_client_id_not_empty 
    CHECK (client_id IS NOT NULL AND length(trim(client_id)) > 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- 约束已存在，忽略
    NULL;
END $$;

-- 3.1 创建 incomplete_history_records 表（未完成记录表）
-- 存储“未完成”的练习进度，供多设备查看/统计；不做续玩逻辑
CREATE TABLE IF NOT EXISTS public.incomplete_history_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  problem_type TEXT NOT NULL CHECK (problem_type IN ('mental','written','mixed','properties')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('basic','challenge')),
  total_problems INTEGER NOT NULL, -- 已作答题数
  correct_answers INTEGER NOT NULL,
  accuracy NUMERIC NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  total_time INTEGER NOT NULL,
  average_time NUMERIC NOT NULL,
  problems JSONB NOT NULL,
  answers JSONB NOT NULL,
  answer_times JSONB NOT NULL,
  score INTEGER NOT NULL,
  planned_total_problems INTEGER NOT NULL,
  client_id TEXT
);

-- 启用 RLS 并添加策略
ALTER TABLE public.incomplete_history_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "用户可以查看自己的未完成记录"
  ON public.incomplete_history_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "用户可以插入自己的未完成记录"
  ON public.incomplete_history_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "用户可以更新自己的未完成记录"
  ON public.incomplete_history_records FOR UPDATE
  USING (auth.uid() = user_id);

-- 唯一约束（或唯一索引）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'uniq_incomplete_user_client'
  ) THEN
    CREATE UNIQUE INDEX uniq_incomplete_user_client
      ON public.incomplete_history_records(user_id, client_id)
      WHERE client_id IS NOT NULL;
  END IF;
END $$;

-- 为未完成记录表添加 client_id 约束
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'chk_incomplete_client_id_not_empty'
  ) THEN
    ALTER TABLE public.incomplete_history_records 
    ADD CONSTRAINT chk_incomplete_client_id_not_empty 
    CHECK (client_id IS NOT NULL AND length(trim(client_id)) > 0);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 4. 创建函数：自动创建用户资料
-- 当新用户注册时，自动在 profiles 表中创建记录
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, created_at, last_login_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Anonymous'),
    NOW(), 
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建触发器：新用户注册时自动创建资料
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. 创建函数：更新用户最后登录时间
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET last_login_at = NOW()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 创建触发器：用户登录时更新最后登录时间
-- 注意：这个触发器在用户的 auth 状态更新时触发
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE PROCEDURE public.update_last_login();

-- 完成！
-- 执行成功后，你的数据库将拥有：
-- ✅ profiles 表：存储用户资料
-- ✅ history_records 表：存储练习历史
-- ✅ RLS 安全策略：确保用户只能访问自己的数据
-- ✅ 自动触发器：新用户注册时自动创建资料，登录时更新时间
-- ✅ 性能索引：提高查询速度
