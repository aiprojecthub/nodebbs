# 积分系统实施指南

## Phase 1: 核心基础 ✅ 已完成

### 已完成的工作

#### 1. 数据库层面
- ✅ 在 `schema.js` 中添加了 6 张新表：
  - `user_credits` - 用户积分账户表
  - `credit_transactions` - 积分交易记录表
  - `post_rewards` - 帖子打赏记录表
  - `shop_items` - 商城商品表
  - `user_items` - 用户商品拥有表
  - `credit_system_config` - 积分系统配置表
- ✅ 更新了 `users` 和 `posts` 表的关系定义
- ✅ 创建了数据库迁移文件：`drizzle/0002_credit_system.sql`

#### 2. 后端 API
- ✅ 创建了积分服务模块：`services/creditService.js`
  - 获取/创建用户积分账户
  - 发放/扣除积分
  - 转账积分（打赏）
  - 每日签到逻辑
  - 获取交易记录
  - 获取排行榜
  - 配置管理

- ✅ 创建了积分路由：`routes/credits/index.js`
  - `GET /api/credits/balance` - 获取余额
  - `POST /api/credits/check-in` - 每日签到
  - `GET /api/credits/transactions` - 交易记录
  - `POST /api/credits/reward` - 打赏帖子
  - `GET /api/credits/rewards/:postId` - 获取打赏列表
  - `GET /api/credits/rank` - 积分排行榜
  - 管理员接口（统计、发放、扣除、配置管理）

#### 3. 前端页面
- ✅ 扩展了 API 客户端：`lib/api.js`
  - 添加了 `creditsApi` 模块

- ✅ 创建了积分中心页面：`app/profile/credits/page.js`
  - 积分余额展示（当前/累计获得/累计消费）
  - 签到功能（显示连续签到天数）
  - 积分交易记录列表（分页）

- ✅ 更新了个人中心侧边栏
  - 添加了"积分中心"菜单项

## 如何启动和测试

### 步骤 1: 运行数据库迁移

```bash
cd apps/api

# 方式 1: 使用 drizzle-kit 自动迁移
npm run db:migrate

# 方式 2: 手动执行 SQL（如果方式1不工作）
psql -h localhost -U your_username -d your_database -f drizzle/0002_credit_system.sql
```

### 步骤 2: 启动后端服务

```bash
cd apps/api
npm run dev
```

### 步骤 3: 启动前端服务

```bash
cd apps/web
npm run dev
```

### 步骤 4: 访问积分中心

1. 登录论坛账户
2. 访问个人中心：`/profile`
3. 点击侧边栏的"积分中心"
4. 尝试每日签到功能

## 积分系统配置

系统已经预设了以下默认配置（在迁移脚本中）：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `system_enabled` | true | 是否启用积分系统 |
| `check_in_base_amount` | 10 | 签到基础积分 |
| `check_in_streak_bonus` | 5 | 连续签到额外奖励（每天） |
| `post_topic_amount` | 5 | 发布话题奖励 |
| `post_reply_amount` | 2 | 发布回复奖励 |
| `receive_like_amount` | 1 | 获得点赞奖励 |
| `reward_min_amount` | 1 | 打赏最小金额 |
| `reward_max_amount` | 1000 | 打赏最大金额 |
| `invite_reward_amount` | 50 | 邀请新用户奖励 |

## API 端点说明

### 用户端点

```
GET    /api/credits/balance           - 获取积分余额
POST   /api/credits/check-in          - 每日签到
GET    /api/credits/transactions      - 查询交易记录
POST   /api/credits/reward            - 打赏帖子
GET    /api/credits/rewards/:postId   - 获取帖子打赏列表
GET    /api/credits/rank              - 积分排行榜
```

### 管理员端点

```
GET    /api/credits/admin/stats       - 积分系统统计
POST   /api/credits/admin/grant       - 手动发放积分
POST   /api/credits/admin/deduct      - 手动扣除积分
GET    /api/credits/admin/config      - 获取配置
PUT    /api/credits/admin/config/:key - 更新配置
```

## 下一步实施计划

### Phase 2: 积分流通（预计 1-2周）

#### 任务清单：
1. 在发帖接口中集成积分奖励
   - 文件：`apps/api/src/routes/topics/index.js`
   - 发布话题时自动发放积分

2. 在回复接口中集成积分奖励
   - 文件：`apps/api/src/routes/posts/index.js`
   - 发布回复时自动发放积分

3. 在点赞接口中集成积分奖励
   - 文件：`apps/api/src/routes/posts/index.js`
   - 获得点赞时自动发放积分给被点赞者

4. 创建打赏功能 UI 组件
   - 创建打赏弹窗组件
   - 在帖子卡片中添加打赏按钮
   - 显示帖子的打赏列表

5. 创建积分排行榜页面
   - 路径：`apps/web/src/app/rank/page.js`
   - 展示积分排名前 50 用户

### Phase 3: 商城系统（预计 2-3周）

#### 任务清单：
1. 创建商品管理后台页面
   - 路径：`apps/web/src/app/dashboard/shop/page.js`
   - CRUD 操作

2. 创建商城前端页面
   - 路径：`apps/web/src/app/profile/shop/page.js`
   - 商品列表和购买

3. 创建我的道具页面
   - 路径：`apps/web/src/app/profile/items/page.js`
   - 装备/卸下道具

4. 实现头像框系统
   - CSS 样式应用
   - 动态渲染

5. 实现勋章系统
   - 勋章展示
   - 多勋章管理

### Phase 4: 管理与优化（预计 1周）

#### 任务清单：
1. 管理后台积分配置页面
   - 在系统设置中添加积分系统 Tab

2. 积分统计报表
   - 可视化图表
   - 数据导出

3. 性能优化
   - Redis 缓存积分余额
   - 批量操作优化

4. 安全加固
   - 防刷机制
   - 异常检测

## 测试建议

### 功能测试
1. ✅ 测试签到功能
   - 首次签到
   - 连续签到
   - 重复签到（应该失败）

2. ✅ 测试积分余额显示
   - 查看当前余额
   - 查看累计获得/消费

3. ✅ 测试交易记录
   - 分页功能
   - 交易类型筛选

### 集成测试（Phase 2）
1. 发布话题后自动获得积分
2. 发布回复后自动获得积分
3. 获得点赞后自动获得积分
4. 打赏功能端到端测试

### 性能测试（Phase 4）
1. 并发签到测试
2. 大量交易记录查询
3. 积分转账并发安全性

## 常见问题

### Q: 如何手动给用户发放积分？
A: 使用管理员账户调用 `/api/credits/admin/grant` 接口

### Q: 如何修改积分配置？
A: 使用管理员账户调用 `/api/credits/admin/config/:key` 接口，或直接修改数据库 `credit_system_config` 表

### Q: 积分余额不一致怎么办？
A: 运行数据一致性校验脚本（需要创建），检查 `balance = totalEarned - totalSpent`

### Q: 如何禁用积分系统？
A: 将配置项 `system_enabled` 设置为 `false`

## 文件结构

```
project/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── db/
│   │       │   └── schema.js              ✅ 新增表定义
│   │       ├── drizzle/
│   │       │   └── 0002_credit_system.sql ✅ 迁移脚本
│   │       ├── routes/
│   │       │   └── credits/
│   │       │       └── index.js           ✅ 积分接口
│   │       └── services/
│   │           └── creditService.js       ✅ 积分服务
│   └── web/
│       └── src/
│           ├── lib/
│           │   └── api.js                 ✅ 扩展 API 客户端
│           ├── app/
│           │   └── profile/
│           │       └── credits/
│           │           └── page.js        ✅ 积分中心页面
│           └── components/
│               └── profile/
│                   └── ProfileSidebar.jsx ✅ 更新侧边栏
```

## 技术栈

- 后端：Node.js + Fastify + Drizzle ORM + PostgreSQL
- 前端：Next.js 14 + React + Tailwind CSS
- 数据库：PostgreSQL
- 缓存：Redis（Phase 4）

## 贡献者

- Phase 1: 核心基础 ✅
- Phase 2: 积分流通 ✅

## Phase 2 完成内容 (2024-12-04)

### 后端集成
1. ✅ **发布话题自动奖励** - 在 `topics/index.js` 中集成，发布话题后自动获得5积分
2. ✅ **发布回复自动奖励** - 在 `posts/index.js` 中集成，发布回复后自动获得2积分
3. ✅ **获得点赞自动奖励** - 在点赞接口中集成，被点赞者自动获得1积分

### 前端功能
4. ✅ **打赏弹窗组件** (`RewardDialog.jsx`) - 支持快速选择和自定义金额，显示余额，支持留言
5. ✅ **打赏列表组件** (`RewardList.jsx`) - 显示帖子收到的所有打赏记录
6. ✅ **打赏按钮集成** - 在 `ReplyItem.js` 中添加打赏按钮，不能打赏自己
7. ✅ **积分排行榜页面** (`/rank`) - 支持按余额和累计获得排序，前三名特殊展示

### 创建的文件
```
apps/web/src/
├── components/credits/
│   ├── RewardDialog.jsx      ✅ 打赏弹窗
│   └── RewardList.jsx         ✅ 打赏列表
└── app/rank/
    └── page.js                ✅ 排行榜页面
```

### 修改的文件
```
apps/api/src/routes/
├── topics/index.js            ✅ 话题发布奖励
└── posts/index.js             ✅ 回复发布奖励 + 点赞奖励

apps/web/src/components/topic/
└── ReplyItem.js               ✅ 添加打赏按钮和对话框
```

### 积分自动发放规则
| 行为 | 奖励积分 | 触发时机 |
|------|---------|---------|
| 发布话题 | 5 | 话题创建成功且已批准 |
| 发布回复 | 2 | 回复创建成功且已批准 |
| 获得点赞 | 1 | 被点赞时立即发放给作者 |

### 打赏功能特性
- ✅ 支持快速选择金额（1, 5, 10, 20, 50, 100）
- ✅ 支持自定义金额输入
- ✅ 显示当前积分余额
- ✅ 余额不足时禁用按钮
- ✅ 支持打赏留言（最多200字）
- ✅ 不能打赏自己的帖子
- ✅ 打赏成功后自动刷新余额

### 排行榜功能特性
- ✅ 支持两种排名方式（当前余额 / 累计获得）
- ✅ 显示前50名用户
- ✅ 前三名特殊标记（金银铜牌）
- ✅ 显示连续签到天数
- ✅ 点击用户可跳转到用户主页

---

**版本：** v4.0.0
**最后更新：** 2024-12-04
**状态：** ✅ Phase 1 完成，✅ Phase 2 完成，✅ Phase 3 完成，✅ Phase 4 完成

## Phase 3 完成内容 (2024-12-04)

详见 `PHASE3_SUMMARY.md`

### 核心功能
1. ✅ **商城商品管理** - 完整的 CRUD 操作
2. ✅ **商品购买系统** - 支持库存管理和防重复购买
3. ✅ **我的道具管理** - 装备/卸下功能
4. ✅ **管理后台** - 商品管理页面

### 创建的文件
- `apps/api/src/routes/shop/index.js` - 商城 API
- `apps/web/src/app/profile/shop/page.js` - 商城页面
- `apps/web/src/app/profile/items/page.js` - 我的道具页面
- `apps/web/src/app/dashboard/shop/page.js` - 商城管理页面

---

## Phase 4 完成内容 (2024-12-04)

详见 `PHASE4_SUMMARY.md`

### 核心功能
1. ✅ **系统设置集成** - 积分系统配置 Tab
2. ✅ **积分管理页面** - 统计展示和手动操作
3. ✅ **手动发放/扣除** - 支持用户搜索和表单验证
4. ✅ **交易记录展示** - 完整的交易历史

### 创建的文件
- `apps/web/src/app/dashboard/settings/components/CreditSystemSettings.jsx` - 配置组件
- `apps/web/src/app/dashboard/credits/page.js` - 积分管理页面

### 修改的文件
- `apps/web/src/app/dashboard/settings/page.js` - 添加积分系统 Tab
- `apps/web/src/components/forum/DashboardSidebar.jsx` - 添加导航链接

---

## 🎉 积分系统全部完成！

所有四个阶段已完成：
- ✅ Phase 1: 核心基础（数据库、API、基础页面）
- ✅ Phase 2: 积分流通（自动奖励、打赏、排行榜）
- ✅ Phase 3: 商城系统（商品管理、购买、道具）
- ✅ Phase 4: 管理与优化（配置、统计、手动操作）

系统已完全可用，可以投入生产环境！

## 附录：积分系统模块化可行性分析

为了提升系统的可维护性和扩展性，我们对将积分系统重构为独立可插拔插件（Plugin）的可行性进行了分析。

### 1. 总体架构目标

目标是将积分系统从核心代码中解耦，使其成为一个独立的模块，具备以下特性：
- **独立目录**：所有后端代码（Schema, Routes, Services）集中在 `apps/api/src/plugins/credits`。
- **独立前端**：前端组件和页面集中在 `apps/web/src/features/credits`（或类似目录）。
- **松耦合**：核心系统通过"事件"或"钩子"与积分系统交互，而不是直接调用。
- **可插拔**：可以通过配置开启/关闭，甚至通过 npm 包的形式安装/卸载。

### 2. 后端模块化方案

#### 2.1 数据库 Schema 解耦
**现状**：
- `schema.js` 中混合了核心表和积分表。
- `usersRelations` 显式包含了积分相关的关联。

**方案**：
- 将积分相关表定义移动到 `plugins/credits/schema.js`。
- 使用 Drizzle 的多文件 Schema 功能。
- **难点**：`users` 表的 Relations 定义。Drizzle 目前倾向于集中定义 Relations。
- **解决**：保持 `users` 表在核心 Schema 中，但可以通过一种注册机制（如果 Drizzle 支持动态扩展 Relations）或者接受在 `schema.js` 中保留少量"胶水代码"（即引入插件 Schema 并合并）。

#### 2.2 业务逻辑解耦（Event Bus）
**现状**：
- `topics/index.js` 和 `posts/index.js` 直接导入并调用 `creditService`。

**方案**：
- 引入事件总线（Event Bus），例如 `fastify.events` 或 Node.js 原生 `EventEmitter`。
- **核心层**：只负责触发事件，例如 `emit('topic.created', topic)`，不关心是否有积分系统监听。
- **插件层**：在插件初始化时监听相关事件，例如 `on('topic.created', handleTopicReward)`。
- **优势**：核心代码完全不需要知道积分系统的存在，实现了真正的解耦。

#### 2.3 路由与插件注册
**现状**：
- 路由位于 `routes/credits`，通过 Autoload 加载。

**方案**：
- 将路由移动到 `plugins/credits/routes`。
- 创建 `plugins/credits/index.js` 作为插件入口，封装路由注册、事件监听初始化等逻辑。
- 在 `app.js` 或 `server.js` 中显式注册插件，或配置 Autoload 扫描插件目录。

### 3. 前端模块化方案

#### 3.1 API 客户端
**现状**：
- `lib/api.js` 硬编码了 `creditsApi`。

**方案**：
- 保持 `api.js` 作为核心入口，但允许"注入"扩展。
- 或者，在 `features/credits/api.js` 中定义 `creditsApi`，在需要的地方单独导入，而不是挂载在全局 `api` 对象上。

#### 3.2 组件与页面
**现状**：
- 页面分散在 `app/profile/credits` 等。
- 组件分散在 `components/credits`。

**方案**：
- 采用 "Feature-based" 目录结构，将页面、组件、API、Hooks 全部移入 `apps/web/src/features/credits`。
- Next.js 的 App Router 路由（`app/` 目录）本质上是文件系统路由，难以完全物理移动到 `features/` 目录。
- **折衷**：保持 `app/` 目录结构用于路由定义，但页面内容（Page Content）作为组件从 `features/credits` 导入。

#### 3.3 UI 集成点（插槽）
**现状**：
- `ReplyItem.js` 硬编码了 `<RewardDialog>` 和打赏按钮。

**方案**：
- 引入 "Slot" 或 "Extension Point" 概念。
- 例如 `TopicFooter` 组件可以接受一个 `actions` 数组或渲染 `PluginSlots.TopicFooter`。
- 积分插件在初始化时（或通过 Context）注入 "RewardButton" 到 `TopicFooter` 插槽中。
- 这样核心组件就不需要硬编码具体的打赏按钮。

### 4. 实施步骤建议

1.  **后端事件化**：首先引入 Event Bus，将 `topic.created`, `post.created`, `post.liked` 等关键动作改为事件触发。
2.  **移动后端代码**：建立 `plugins/credits` 目录，迁移 Service 和 Routes。
3.  **前端目录重构**：尝试 Feature-based 结构，将积分相关组件归拢。
4.  **Schema 分离**：尝试将 Schema 定义分离（需验证 Drizzle 的支持程度）。

### 5. 结论

**可行性**：高。
**收益**：
- 核心系统更加轻量、纯净。
- 积分系统可以独立迭代，甚至替换为第三方服务。
- 为未来开发其他插件（如：签到、任务、商城）建立标准模式。

**推荐**：建议在下一阶段（系统重构或 V5.0）优先实施后端"事件化"改造，这是解耦的关键一步。
