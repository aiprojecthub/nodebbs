'use client';

import { useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { useUserItems } from '@/extensions/shop/hooks/useUserItems';
import { useItemActions } from '@/extensions/shop/hooks/useItemActions';
import { ItemTypeSelector } from '@/extensions/shop/components/shared/ItemTypeSelector';
import { ItemInventoryGrid } from '../../components/user/ItemInventoryGrid';
import { ConfirmDialog } from '@/components/common/AlertDialog';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 解析商品 metadata JSON
 */
function parseItemMeta(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed || {};
  } catch {
    return {};
  }
}

/**
 * Action 处理器注册表
 *
 * 每个 action 定义：
 * - confirm(item, meta): 返回确认对话框 props（title, description, confirmText）
 *     返回 null 表示跳过确认直接执行
 * - getPayload(item, meta): 返回传给后端的 useData
 *     若需要额外用户输入（如改名卡的新用户名），应在此 action 中打开专用对话框而非走通用确认流程
 *
 * 扩展示例：
 *   actionHandlers.set('rename', {
 *     confirm: () => null, // 改为打开 RenameDialog
 *   });
 */
const actionHandlers = new Map();

// 默认 handler：通用确认
const defaultHandler = {
  confirm: (item) => {
    const quantity = item.quantity ?? 1;
    return {
      title: `使用「${item.itemName}」`,
      description: `确认使用该道具吗？使用后将消耗 1 个（剩余 ${quantity - 1} 个），此操作不可撤销。`,
      confirmText: '确认使用',
    };
  },
  getPayload: () => ({}),
};

function getHandler(action) {
  return actionHandlers.get(action) || defaultHandler;
}

export default function UserItemsPage() {
  const [itemType, setItemType] = useState('all');
  const { updateUser } = useAuth();

  const { items, loading, refetch, setItems, setItemEquipped, setItemEquippedWithUnequipSameType } = useUserItems({ type: itemType });

  const { equip, unequip, useItem, actioningItemId } = useItemActions();

  // 确认对话框状态：{ item, handler, confirmProps }
  const [confirmState, setConfirmState] = useState(null);

  const handleEquip = async (userItemId) => {
    const item = items.find(i => i.id === userItemId);
    await equip(userItemId, (response) => {
      setItemEquippedWithUnequipSameType(userItemId, item?.itemType);
      if (response.avatarFrame !== undefined) {
        updateUser({ avatarFrame: response.avatarFrame });
      }
    });
  };

  const handleUnequip = async (userItemId) => {
    await unequip(userItemId, (response) => {
      setItemEquipped(userItemId, false);
      if (response.avatarFrame !== undefined) {
        updateUser({ avatarFrame: response.avatarFrame });
      }
    });
  };

  // 消耗品使用后的乐观更新
  const optimisticUseUpdate = useCallback((itemId) => {
    setItems(prev => prev
      .map(i => {
        if (i.id !== itemId) return i;
        const newQty = (i.quantity || 1) - 1;
        return { ...i, quantity: newQty, status: newQty <= 0 ? 'exhausted' : 'active' };
      })
      .filter(i => i.quantity > 0)
    );
  }, [setItems]);

  // 点击使用 → 按 action 分发
  const handleUseClick = (item) => {
    const meta = parseItemMeta(item.itemMetadata);
    const action = meta.action || 'generic_use';
    const handler = getHandler(action);
    const confirmProps = handler.confirm?.(item, meta);

    if (!confirmProps) {
      // action 不需要通用确认（会打开专用对话框），暂跳过
      return;
    }
    setConfirmState({ item, handler, confirmProps });
  };

  // 确认后执行
  const handleConfirm = async () => {
    if (!confirmState) return;
    const { item, handler } = confirmState;
    const payload = handler.getPayload?.(item) || {};
    setConfirmState(null);

    await useItem(item.id, payload, () => optimisticUseUpdate(item.id));
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 p-6">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start text-center md:text-left justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center md:justify-start gap-3">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                 <Package className="h-5 w-5" />
              </span>
              我的道具
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
               管理您的专属装扮与收藏，自由搭配个人风格。
            </p>
          </div>
        </div>
      </div>

      {/* Item Type Selector & Grid */}
      <ItemTypeSelector value={itemType} onChange={setItemType} excludedTypes={[]}>
        <ItemInventoryGrid
          items={items}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onUse={handleUseClick}
          actioningItemId={actioningItemId}
          loading={loading}
          itemType={itemType}
        />
      </ItemTypeSelector>

      {/* 通用确认对话框（具体 action 可注册专用对话框绕过此处） */}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        onConfirm={handleConfirm}
        {...(confirmState?.confirmProps || {})}
      />
    </div>
  );
}
