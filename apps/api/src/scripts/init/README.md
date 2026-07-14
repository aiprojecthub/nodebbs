# 系统初始化脚本

统一的系统配置初始化脚本，用于初始化或还原系统配置到默认值。

## 文件结构

```
api/src/scripts/init/
├── index.js        # 主入口文件，处理命令行参数和协调各模块
├── settings.js     # 系统设置配置和初始化逻辑
├── oauth.js        # OAuth 提供商配置和初始化逻辑
├── invitation.js   # 邀请规则配置和初始化逻辑
└── README.md       # 本文档
```

## 模块说明

### index.js
主入口文件，负责：
- 解析命令行参数
- 显示帮助信息
- 协调各个初始化模块
- 汇总统计信息

### settings.js
系统设置模块，包含：
- `SETTING_KEYS`: 系统设置默认配置
- `SETTINGS_BY_CATEGORY`: 按分类分组的设置
- `CATEGORY_NAMES`: 分类名称映射
- `initSystemSettings()`: 初始化系统设置
- `listSystemSettings()`: 列出系统设置

### oauth.js
OAuth 提供商模块，包含：
- `OAUTH_PROVIDERS`: OAuth 提供商默认配置
- `initOAuthProviders()`: 初始化 OAuth 提供商
- `listOAuthProviders()`: 列出 OAuth 提供商

### invitation.js
邀请规则模块，包含：
- `INVITATION_RULES`: 邀请规则默认配置
- `initInvitationRules()`: 初始化邀请规则
- `listInvitationRules()`: 列出邀请规则

## 使用方法

### 基本命令

```bash
# 查看帮助信息
node src/scripts/init/index.js --help

# 列出所有配置项
node src/scripts/init/index.js --list

# 初始化缺失的配置（默认行为，不覆盖现有配置）
node src/scripts/init/index.js
# 或
node src/scripts/init/index.js --missing

# 重置所有配置到默认值（会覆盖现有配置）
node src/scripts/init/index.js --reset
```

### 命令行选项

| 选项 | 说明 |
|------|------|
| `--help`, `-h` | 显示帮助信息 |
| `--list` | 列出所有配置项及其默认值 |
| `--missing` | 只添加缺失的配置（默认行为） |
| `--reset` | 重置所有配置到默认值（会覆盖现有配置） |

## 初始化内容

### 1. 系统设置（11 个配置项）

#### 通用设置
- `site_name`: 站点名称
- `site_description`: 站点描述

#### 功能开关
- `registration_mode`: 注册模式（open/invitation/closed）
- `email_verification_required`: 是否要求邮箱验证
- `moderation_config`: 内容审核配置（主开关 + 分类型开关）

#### 访问限速
- `rate_limit_enabled`: 是否启用访问限速
- `rate_limit_window_ms`: 限速时间窗口（毫秒）
- `rate_limit_max_requests`: 时间窗口内最大请求数
- `rate_limit_auth_multiplier`: 已登录用户的限速倍数

### 2. OAuth 提供商（3 个提供商）

- GitHub
- Google
- Apple

### 3. 邀请规则（2 个角色）

| 角色 | 每日限制 | 每码使用次数 | 有效期 | 积分消耗 |
|------|---------|-------------|--------|---------|
| user | 1 | 1 | 30天 | 0 |
| admin | 100 | 1 | 365天 | 0 |

## 设计优势

### 1. 模块化设计
- 每个功能模块独立文件，职责清晰
- 易于维护和扩展
- 可以单独导入使用

### 2. 统一接口
- 所有初始化函数返回统一的结果格式：
  ```javascript
  {
    addedCount: number,    // 新增数量
    updatedCount: number,  // 更新数量
    skippedCount: number,  // 跳过数量
    total: number          // 总数量
  }
  ```

### 3. 灵活性
- 支持单独导入某个模块使用
- 可以在其他脚本中复用初始化逻辑
- 易于添加新的配置模块

### 4. 可测试性
- 每个模块可以独立测试
- 纯函数设计，易于单元测试

## 扩展指南

### 添加新的配置模块

1. 创建新的模块文件（如 `email.js`）：

```javascript
// email.js
import { emailSettings } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const EMAIL_CONFIGS = [
  // 配置项...
];

export async function initEmailSettings(db, reset = false) {
  // 初始化逻辑...
  return { addedCount, updatedCount, skippedCount, total };
}

export function listEmailSettings() {
  // 列出配置...
}
```

2. 在 `index.js` 中导入并使用：

```javascript
import { initEmailSettings, listEmailSettings } from './email.js';

// 在 listAllSettings() 中添加
function listAllSettings() {
  listSystemSettings();
  listOAuthProviders();
  listInvitationRules();
  listEmailSettings(); // 新增
}

// 在 initAllSettings() 中添加
async function initAllSettings(reset = false) {
  // ...
  const emailResult = await initEmailSettings(db, reset);
  // 添加统计输出...
}
```

## 注意事项

1. **环境变量**: 确保设置了 `DATABASE_URL` 环境变量
2. **数据库连接**: 脚本会自动管理数据库连接池
3. **重置操作**: 使用 `--reset` 会有 3 秒确认等待时间
4. **幂等性**: 默认模式（`--missing`）是幂等的，可以安全地多次执行

## 相关文件

- 旧版脚本: `api/src/scripts/init-system-settings.js`（已废弃，但保留以兼容）
- 独立脚本: `api/src/scripts/init-invitation-rules.js`（已废弃，但保留以兼容）
- 数据库 Schema: `api/src/db/schema.js`
