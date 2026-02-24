import { useState, useEffect } from 'react';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { SearchSelect } from '@/components/common/SearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, Gift, X, Minus, Plus } from 'lucide-react';
import { CreditsBadge } from '../../../ledger/components/common/CreditsBadge';
import { getItemTypeLabel } from '@/extensions/shop/utils/itemTypes';
import UserAvatar from '@/components/user/UserAvatar';
import { searchApi } from '@/lib/api';

/**
 * 购买确认对话框
 * 统一的购买/赠送流程：商品信息 → 数量选择 → [赠送对象] → 结算摘要
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Object} props.item - 要购买的商品
 * @param {Array} props.accounts - 用户账户列表
 * @param {Function} props.onConfirm - 确认回调，赠送时包含 { isGift, receiverId, message, quantity }
 * @param {Function} props.onCancel - 取消回调
 * @param {boolean} props.purchasing - 购买进行中
 */
export function PurchaseDialog({ open, item, accounts = [], onConfirm, onCancel, purchasing }) {
  const [mode, setMode] = useState('buy');
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setMode('buy');
      setReceiver(null);
      setMessage('');
      setQuantity(1);
    }
  }, [open]);

  // 搜索用户
  const searchUsers = async (query) => {
    const res = await searchApi.search(query, 'users', 1, 5);
    if (res?.users?.items) return res.users.items;
    if (Array.isArray(res?.users)) return res.users;
    return [];
  };

  const transformUser = (user) => ({
    id: user.id,
    label: user.username || user.name,
    avatar: user.avatar,
  });

  const renderUserItem = (user, transformed, onSelect, isHighlighted) => (
    <div
      key={transformed.id}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isHighlighted ? 'bg-accent' : 'hover:bg-muted'}`}
      onClick={onSelect}
    >
      <UserAvatar url={transformed.avatar} name={transformed.label} size="sm" />
      <div className="text-sm font-medium">{transformed.label}</div>
    </div>
  );

  const renderSelectedUser = (user, transformed, onClear) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <UserAvatar url={transformed.avatar} name={transformed.label} size="sm" />
        <span className="font-medium text-sm">{transformed.label}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (!item) return null;

  const account = accounts.find(a => a.currency.code === item.currencyCode);
  const balance = account ? Number(account.balance) : 0;
  const consumeType = item.consumeType || 'non_consumable';
  const isQuantifiable = consumeType !== 'non_consumable';
  const effectiveQty = isQuantifiable ? (parseInt(quantity) || 1) : 1;
  const totalPrice = item.price * effectiveQty;
  const canAfford = balance >= totalPrice;

  const getMaxQuantity = () => {
    let max = 99;
    if (item.stock !== null) max = Math.min(max, item.stock);
    if (item.maxOwn !== null) {
      const ownedCount = item.ownedCount || 0;
      max = Math.min(max, Math.max(0, item.maxOwn - ownedCount));
    }
    if (item.price > 0) max = Math.min(max, Math.floor(balance / item.price));
    return Math.max(0, max);
  };

  const maxQty = getMaxQuantity();

  const handleConfirm = () => {
    if (mode === 'gift') {
      if (!receiver) return;
      onConfirm({ isGift: true, receiverId: receiver.id, message, quantity: effectiveQty });
    } else {
      onConfirm({ quantity: effectiveQty });
    }
  };

  const isDisabled = purchasing || !canAfford || (isQuantifiable && maxQty <= 0) || (mode === 'gift' && !receiver);

  return (
    <FormDialog
      open={open}
      onOpenChange={onCancel}
      maxWidth="sm:max-w-[440px]"
      title={mode === 'gift' ? '赠送商品' : '购买商品'}
      description={item.name}
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={purchasing}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isDisabled}>
            {purchasing ? (
              <><Loader2 className="h-4 w-4 animate-spin" />处理中...</>
            ) : (
              <>
                {mode === 'gift' ? <Gift className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {mode === 'gift' ? '确认赠送' : '确认购买'}
              </>
            )}
          </Button>
        </DialogFooter>
      }
    >
      <div className="space-y-4">
        {/* Tab 切换 */}
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">自用购买</TabsTrigger>
            <TabsTrigger value="gift">赠送好友</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* 商品信息：固定显示单价 */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {item.imageUrl && (
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-background">
              <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{item.name}</div>
            <div className="text-xs text-muted-foreground">{getItemTypeLabel(item.type)}</div>
          </div>
          <div className="text-right shrink-0">
            <CreditsBadge amount={item.price} currencyCode={item.currencyCode} />
            {isQuantifiable && <div className="text-[10px] text-muted-foreground">单价</div>}
          </div>
        </div>

        {/* 赠送对象（仅赠送模式） */}
        {mode === 'gift' && (
          <div className="space-y-2">
            <SearchSelect
              value={receiver}
              onChange={setReceiver}
              searchFn={searchUsers}
              transformData={transformUser}
              renderItem={renderUserItem}
              renderSelected={renderSelectedUser}
              label="赠送给"
              placeholder="输入用户名搜索..."
              autoSearch={true}
              debounceMs={500}
              emptyText="未找到相关用户"
            />
            {receiver && (
              <div className="space-y-1.5">
                <Label className="text-xs">赠言（可选）</Label>
                <Textarea
                  placeholder="写点什么..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="text-[10px] text-right text-muted-foreground">{message.length}/200</div>
              </div>
            )}
          </div>
        )}

        {/* 数量选择（消耗品，买/赠共用） */}
        {isQuantifiable && (
          <div className="space-y-1.5">
            <Label className="text-xs">数量</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') { setQuantity(''); return; }
                  const n = parseInt(v);
                  if (!isNaN(n)) setQuantity(Math.min(maxQty, n));
                }}
                onBlur={() => {
                  const n = typeof quantity === 'number' ? quantity : parseInt(quantity);
                  setQuantity(isNaN(n) || n < 1 ? 1 : Math.min(maxQty, n));
                }}
                className="w-16 text-center h-8 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="h-3 w-3" />
              </Button>
              {maxQty < 99 && maxQty > 0 && (
                <span className="text-[10px] text-muted-foreground">最多 {maxQty}</span>
              )}
            </div>
          </div>
        )}

        {/* 结算摘要 */}
        <div className="rounded-lg border bg-card p-3 space-y-2 text-sm">
          {/* 单价 × 数量 */}
          {isQuantifiable && (
            <div className="flex justify-between text-muted-foreground">
              <span>小计</span>
              <span>{item.price} × {effectiveQty}</span>
            </div>
          )}
          {/* 应付 */}
          <div className="flex justify-between font-medium">
            <span>应付</span>
            <CreditsBadge amount={totalPrice} currencyCode={item.currencyCode} />
          </div>
          {!canAfford && (
            <>
              <Separator />
              <div className="text-xs text-destructive text-right">余额不足</div>
            </>
          )}
        </div>
      </div>
    </FormDialog>
  );
}
