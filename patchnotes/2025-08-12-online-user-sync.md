# 2025-08-12 Online 用户系统与同步机制（未提交改动说明）

本次未提交的改动为项目接入 Supabase 在线账号体系、离线可用（PWA）与多设备记录同步的第一版，实现最小可用的注册/登录、完成记录上行同步（Outbox）与云端下拉合并，以及老版本“本地用户历史”导入到当前在线账号。

## 新增与变更概览

- 认证与账户
  - 新增 `src/hooks/useOnlineAuth.ts`：封装 Supabase 会话、注册/登录/登出。
  - 新增 `src/components/OnlineAuthModal.tsx`：在线登录/注册弹窗。
  - 修改 `src/components/UserInfo.tsx`：在用户名旁显示在线邮箱；提供“在线登录/注册”或“退出在线登录”。
  - 修改 `src/App.tsx`：接入在线账户弹窗；在线时“历史记录”默认按在线账号 `user.id` 显示。

- 同步与记录
  - 新增 `src/hooks/useSyncManager.ts`：Outbox 队列、Push（upsert）+ Pull（拉取）+ 合并、在线监听与“立即同步”。
  - 修改 `src/services/history.ts`：`saveHistoryRecord` 改为 upsert（`onConflict: 'user_id,client_id'`），新增 `pullAllHistoryRecords`。
  - 修改 `src/types/supabase.ts`：`history_records` 增加 `client_id: string | null` 字段类型。
  - 修改 `src/hooks/useHistoryManager.ts`：新增 `mergeServerRecords`（按 `client_id` 去重合并）、`getLocalRecordCount`。
  - 修改 `src/App.tsx`：
    - 完成记录时，若在线：本地保存 + 组装服务端 payload 入队 + 立即尝试推送。
    - 头部右侧新增“立即同步”按钮与“上次同步时间”。
    - 在线时“历史记录”视图按在线账号展示云端+合并后的数据。

- 导入旧版“本地用户”历史
  - 新增 `src/components/ImportLocalHistoryModal.tsx`：在线后可选择一个或多个本地用户，将其完成记录转为 payload 入队并同步至当前在线账号。
  - 修改 `src/App.tsx`：在线时显示“导入本地历史”按钮，调用 `enqueueBatch` + `flush()`。

- PWA 与离线
  - 修改 `vite.config.ts`：集成 `vite-plugin-pwa`（Dev 下 `dev-sw`；Prod 生成 SW），对 Supabase 请求使用 `NetworkOnly`，避免缓存 API。
  - 新增 `public/manifest.webmanifest` 与图标 `public/icons/pwa-192x192.png`、`public/icons/pwa-512x512.png`。
  - 修改 `index.html`：注入 `<link rel="manifest">` 与 `theme-color`。

- 数据库脚本
  - 修改 `database-setup.sql`：在 `history_records` 表新增 `client_id TEXT`；最初写入了“带 WHERE 的唯一索引”，实际运行中已改为“无条件唯一约束”。

## 重要行为与规则

- 记录绑定与归属
  - 在线账号 A 已登录：离线完成的记录会入队到 `sync_outbox_A`，恢复联网后仅由账号 A 同步至云端（`user_id=A`）。
  - 未登录（游客）：仅本地保存，不会自动上传；后续若需补传需做单独的手动入口（当前未实现）。

- 同步机制
  - Push：遍历 Outbox → Supabase upsert（`onConflict: 'user_id,client_id'`）→ 成功移除、失败保留重试计数。
  - Pull：Push 后拉取当前用户全部记录并与本地按 `client_id` 去重合并；展示以服务端 `date` 排序。
  - “立即同步”按钮：强制执行 Push+Pull，在线可见。

- 历史显示
  - 在线登录时，历史页按在线账号展示云端+本地合并数据；未登录时展示本地用户数据。

## 兼容性与迁移

- 环境变量（构建期注入）
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

- 数据库迁移（必须）
  - 若已执行旧的“带 WHERE 条件的唯一索引”，请执行以下 SQL 更正为“无条件唯一约束”：
    ```sql
    ALTER TABLE public.history_records
      ALTER COLUMN client_id SET NOT NULL;

    DROP INDEX IF EXISTS uniq_history_user_client;

    ALTER TABLE public.history_records
      ADD CONSTRAINT uniq_history_user_client UNIQUE (user_id, client_id);
    ```

- GitHub Pages 部署
  - 运行 `npm run build` 生成 `docs/`，SW + manifest 将在生产环境生效；Dev 环境使用临时 `dev-sw`。

## 可能影响与注意事项

- 未完成记录仅本地保存，不参与同步。
- Supabase RLS 已限制用户仅访问自己的 `user_id` 数据；越权写入会失败。
- 若浏览器缓存旧 SW，建议在 DevTools → Application → Service Workers 中 `Update / Skip waiting` 并强刷。

## 主要改动文件清单

- 新增：
  - `src/hooks/useOnlineAuth.ts`
  - `src/components/OnlineAuthModal.tsx`
  - `src/hooks/useSyncManager.ts`
  - `src/components/ImportLocalHistoryModal.tsx`
  - `public/manifest.webmanifest`
  - `public/icons/pwa-192x192.png`
  - `public/icons/pwa-512x512.png`

- 修改：
  - `src/App.tsx`
  - `src/components/UserInfo.tsx`
  - `src/services/history.ts`
  - `src/types/supabase.ts`
  - `src/hooks/useHistoryManager.ts`
  - `vite.config.ts`
  - `index.html`
  - `database-setup.sql`

## 测试用例

# 2025-08-12 测试用例（未提交改动对应）

目标：验证在线认证、同步（Outbox Push + Pull 合并）、离线可用（PWA）、以及“导入本地历史”的核心流程。

## 前置
- .env 已配置 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`
- Supabase 数据库已存在表与 RLS；`history_records` 上已具备 `UNIQUE (user_id, client_id)`（非部分索引）
- 运行 `npm run dev` 或构建 `npm run build` 后在浏览器打开

## 用例 1：在线注册/登录/登出
1. 打开首页 → 右上角齿轮 → 在线登录/注册
2. 注册新邮箱（或直接登录既有邮箱）
3. 期待：
   - 右上角用户名后显示 `(email)`
   - 重新打开弹窗显示“已登录：email”
4. 点击“退出登录”，期待邮箱消失

## 用例 2：完成记录上行（在线）
1. 在线登录状态，开始并完成一组练习
2. 期待：
   - Console 出现 `[sync] pushing 1 items`、`upsert ok for <client_id>`
   - Supabase Table Editor → `history_records` 查到新记录，`client_id`=本地记录ID，`user_id`=当前登录用户

## 用例 3：多设备下行合并
1. 设备 A 已登录账号 X，完成一组题（确认 Supabase 有记录）
2. 设备 B 登录账号 X，刷新首页 → 历史记录
3. 期待：设备 B 的历史列表出现设备 A 刚刚的记录；排序按 `date` 一致

## 用例 4：离线完成 + 恢复同步
1. 登录账号 X；保持页面打开 → 断网（或 DevTools 勾选 Offline）
2. 完成一组题（本地记录已保存，Outbox 生成但不会上传）
3. 恢复联网
4. 期待：自动或点击“立即同步”后，Console 出现 `pushing / upsert ok`，并能在 Supabase 查到该条记录

## 用例 5：账号隔离与防误传
1. 登录账号 A；断网完成一组题
2. 离线状态“退出登录”后（或直接换账号 B）并联网
3. 点击“立即同步”
4. 期待：该记录不会上传到 B（A 的 Outbox 不会被 B 读取）；重新登录 A 后再同步可上传

## 用例 6：游客/未登录不自动上云
1. 未登录（右上角无邮箱），完成一组题
2. 联网并登录账号 X，点击“立即同步”
3. 期待：游客期的记录不会自动上传（现阶段不补传）

## 用例 7：导入旧版“本地用户”历史
1. 在线登录账号 X
2. 右上角点击“导入本地历史”
3. 在弹窗中勾选一个或多个本地用户（这些用户在旧版存在完成记录）
4. 点击“开始导入并同步”
5. 期待：
   - Console 可见随后执行的 `pushing / upsert ok`
   - Supabase 出现这些记录，`client_id`=本地历史记录ID，`user_id`=账号 X

## 用例 8：PWA 安装与离线可用
1. 地址栏显示“安装应用/在应用中打开”，执行安装
2. 断网后启动已安装的应用
3. 期待：能正常进入首页，开始答题；Supabase 请求因离线不触发；恢复网络点击“立即同步”可推送

## 用例 9：重复入队与幂等
1. 同一条完成记录（同一 `client_id`）重复点击“立即同步”（或多次触发 flush）
2. 期待：云端仅一条记录，队列不会长期残留；无重复数据

## 用例 10：安全与 RLS
1. 以账号 A 登录，尝试在 Supabase 控制台向 `history_records` 写入 `user_id=B` 的记录（或模拟错误）
2. 期待：RLS 拒绝（报错 401/403），前端同步不受影响

---
备注：执行用例时可在 DevTools → Application → Service Workers 中 Update/Skip waiting 并强刷，避免旧 SW 缓存影响。若在线构建/Pages 部署，请以生产地址复测 PWA 行为。
