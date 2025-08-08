# Supabase 设置指南

## 🎯 当前进度
✅ Supabase SDK 已安装  
✅ 客户端配置文件已创建  
✅ 数据库表结构脚本已准备  
⏳ 需要你手动完成的步骤

---

## 📋 接下来需要你完成的步骤

### 1. 创建环境变量文件
由于安全原因，`.env` 文件不能自动创建。请手动创建：

1. 在项目根目录创建 `.env` 文件
2. 复制以下内容并填入你的 Supabase 信息：

```env
# Supabase 配置
VITE_SUPABASE_URL=你的_supabase_项目_url
VITE_SUPABASE_ANON_KEY=你的_supabase_anon_key

# 例子:
# VITE_SUPABASE_URL=https://xyzcompany.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取这些信息的步骤：**
1. 登录 Supabase 控制台
2. 选择你的项目
3. 进入 Settings → API
4. 复制 "Project URL" 到 `VITE_SUPABASE_URL`
5. 复制 "anon public" key 到 `VITE_SUPABASE_ANON_KEY`

### 2. 在 Supabase 中创建数据库表
1. 登录 Supabase 控制台
2. 选择你的项目
3. 进入 SQL Editor
4. 创建新查询
5. 复制 `database-setup.sql` 文件的全部内容
6. 粘贴到 SQL Editor 中
7. 点击 "Run" 执行

### 3. 验证设置
执行完数据库脚本后，检查：
- 进入 Database → Tables，应该看到 `profiles` 和 `history_records` 两个表
- 进入 Authentication → Policies，应该看到相关的 RLS 策略

---

## 🛠️ 已完成的技术设置

### 安装的依赖
- `@supabase/supabase-js`: Supabase JavaScript 客户端

### 创建的文件
- `src/lib/supabase.ts`: Supabase 客户端配置
- `src/types/supabase.ts`: 数据库类型定义
- `database-setup.sql`: 数据库表创建脚本

### 数据库表结构

#### `profiles` 表（用户资料）
- `user_id`: UUID（主键，关联 auth.users）
- `name`: 用户显示名称
- `created_at`: 创建时间
- `last_login_at`: 最后登录时间
- `is_developer`: 是否为开发者

#### `history_records` 表（练习历史）
- `id`: UUID（主键）
- `user_id`: 用户ID
- `date`: 记录时间
- `problem_type`: 题目类型（mental/written/mixed/properties）
- `difficulty`: 难度（basic/challenge）
- `total_problems`: 总题数
- `correct_answers`: 正确答案数
- `accuracy`: 准确率（0-100）
- `total_time`: 总时间（秒）
- `average_time`: 平均时间（秒）
- `problems`: 题目数据（JSON）
- `answers`: 用户答案（JSON）
- `answer_times`: 答题时间（JSON）
- `score`: 得分

---

## 🔒 安全特性
- ✅ Row Level Security (RLS) 已启用
- ✅ 用户只能访问自己的数据
- ✅ 自动触发器处理用户注册和登录
- ✅ 环境变量保护敏感信息

---

## 🧪 测试连接（可选）
完成上述步骤后，你可以在浏览器控制台中测试连接：

1. 运行项目：`npm run dev`
2. 打开浏览器控制台 (F12)
3. 执行以下代码测试：

```javascript
// 测试环境配置
import { checkEnvironmentConfig } from './src/utils/supabaseTest.js';
checkEnvironmentConfig();

// 测试 Supabase 连接
import { testSupabaseConnection } from './src/utils/supabaseTest.js';
testSupabaseConnection();
```

## 📞 下一步
完成上述步骤后，回来告诉我，我将帮你：
1. 验证设置是否正确
2. 创建用户认证功能
3. 将现有的本地历史记录迁移到云端

有任何问题都可以随时问我！
