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

**版本：** v2.0.0
**最后更新：** 2024-12-04
**状态：** ✅ Phase 1 完成，✅ Phase 2 完成，Phase 3 待开始
