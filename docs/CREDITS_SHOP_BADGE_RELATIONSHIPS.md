# 积分、商城与勋章系统逻辑关系与架构文档

本文档详细梳理了当前系统中 **积分 (Credits)**、**商城 (Shop)** 与 **勋章 (Badges)** 三大模块之间的逻辑关系、数据流向以及待改进项。

## 1. 核心实体关系图

```mermaid
graph TD
    User[用户 (Users)]
    
    subgraph Credits [积分系统]
        UserCredits[用户积分账户 (UserCredits)]
        Transactions[交易记录 (Transactions)]
    end
    
    subgraph Shop [商城系统]
        ShopItems[商品定义 (ShopItems)]
        UserItems[用户道具/背包 (UserItems)]
    end
    
    subgraph Badges [勋章系统]
        BadgeDefs[勋章定义 (Badges)]
        UserBadges[用户勋章墙 (UserBadges)]
    end

    User --> UserCredits
    User --> UserItems
    User --> UserBadges

    %% 购买流程
    User -- "1. 购买" --> ShopItems
    ShopItems -- "2. 扣款" --> UserCredits
    UserCredits -- "3. 记录" --> Transactions
    ShopItems -- "4. 发货 (Inventory)" --> UserItems
    ShopItems -- "5. 发货 (Unlock Badge)" --> UserBadges

    %% 关联关系
    ShopItems -. "Metadata: { badgeId }" .-> BadgeDefs
```

## 2. 详细逻辑交互

### 2.1 购买流程 (The Purchase Flow)
当用户调用 `buyItem(userId, itemId)` 时，系统执行一个原子事务 (Transaction)，包含以下步骤：

1.  **检查资格**：
    *   商品是否上架？库存是否充足？
    *   用户是否已拥有该商品？（防止重复购买唯一性商品）
    *   用户积分余额是否充足？
2.  **扣除积分**：
    *   减少 `user_credits.balance`。
    *   增加 `user_credits.total_spent`。
    *   创建 `credit_transactions` 记录 (Type: `shop_purchase`)。
3.  **发放道具 (Inventory)**：
    *   在 `user_items` 表中插入记录。
    *   这是用户"拥有"该商品的凭证，用于在"我的道具"中查看或装备。
4.  **发放特殊资产 (Polymorphic Assets)**：
    *   **如果是勋章 (`type: 'badge'`)**：
        *   系统读取 `shop_items.metadata.badgeId`。
        *   调用勋章服务 `grantBadge(userId, badgeId)`。
        *   在 `user_badges` 表中插入记录。
        *   **结果**：用户解锁了勋章，可以在"个人主页-勋章墙"展示。

### 2.2 数据存储设计 (Schema Design)

*   **积分 (`user_credits`)**：核心资产，数值型。
*   **商城商品 (`shop_items`)**：
    *   `price`: 定价。
    *   `type`: 决定商品行为 (`avatar_frame`, `badge`, `custom`)。
    *   `metadata`: **关键字段** (JSON)，存储多态属性。
        *   对于头像框：`{ "frameUrl": "..." }`
        *   对于勋章：`{ "badgeId": 123 }` (弱关联)
*   **用户背包 (`user_items`)**：
    *   记录购买历史和装备状态 (`is_equipped`)。
    *   **注意**：对于勋章商品，背包里也会有一条记录，但勋章通常不讲究"装备"（而是展示），因此勋章在背包页通常被隐藏 (Filtered out)，只在勋章墙展示。

## 3. 待改进项 (Improvements & Tech Debt)

### 3.1 数据一致性与完整性
-   **[High] 弱引用风险**：`shop_items.metadata.badgeId` 是逻辑引用，没有数据库外键约束。
    -   *风险*：如果管理员删除了勋章 (Badge ID 100)，但忘记下架对应的商品，用户购买会报错或只买到空道具。
    -   *建议*：在删除勋章的接口中增加检查，禁止删除已被商城关联的勋章，或级联下架相关商品。
-   **[Medium] 商品更新逻辑**：
    -   *现状*：修改商品 `badgeId` 不会更新已购买用户的勋章。
    -   *建议*：在管理后台增加提示，建议"不要修改已售商品的绑定资产，而是新建商品"。

### 3.2 架构解耦
-   **[Low] 模块依赖**：目前 `shopService` 直接导入了 `badgeService`。
    -   *现状*：硬编码调用 `import { grantBadge } ...`。
    -   *建议*：未来可改为**事件驱动 (Event Driven)**。
        -   商城抛出事件 `EventBus.emit('SHOP_PURCHASE_SUCCESS', { type: 'badge', metadata: ... })`。
        -   勋章系统监听该事件并自动发放。
        -   优点：商城完全不需要知道勋章系统的存在，彻底解耦。

### 3.3 用户体验 (UX)
-   **[Medium] 购买反馈**：
    -   *已优化*：前端增加了 confetti 动画。
    -   *待优化*：目前如果购买失败（如勋章已存在），后端报错信息较为通用。可以细化错误码，明确提示用户"您已拥有该勋章"（不仅仅是拥有该商品）。

### 3.4 代码健壮性
-   **[Medium] Metadata 类型安全**：
    -   *已修复*：解决了 Metadata 双重 JSON 编码的问题。
    -   *建议*：引入 Zod 或 TypeBox 在 Service 层进行更严格的运行时 Metadata 结构校验，确保 `badge` 类型的商品必须包含 `badgeId`。
