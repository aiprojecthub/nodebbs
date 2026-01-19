import { useState, useEffect } from 'react';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import { FormDialog } from '@/components/common/FormDialog';
import { SearchSelect } from '@/components/common/SearchSelect';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Check, X, Gift } from 'lucide-react';
import { CreditsBadge } from '../../../ledger/components/common/CreditsBadge';
import { getItemTypeLabel } from '@/extensions/shop/utils/itemTypes';
import UserAvatar from '@/components/user/UserAvatar';
import { searchApi } from '@/lib/api';

/**
 * 购买确认对话框
 * @param {Object} props
 * @param {boolean} props.open - 对话框打开状态
 * @param {Object} props.item - 要购买的商品
 * @param {Array} props.accounts - User's accounts list
 * @param {Function} props.onConfirm - 确认时的回调。如果是赠送，包含 { isGift, receiverId, message }。
 * @param {Function} props.onCancel - 取消时的回调
 * @param {boolean} props.purchasing - 购买进行中
 */
export function PurchaseDialog({ open, item, accounts = [], onConfirm, onCancel, purchasing }) {
  const [mode, setMode] = useState('buy'); // 'buy' | 'gift'
  const [receiver, setReceiver] = useState(null);
  const [message, setMessage] = useState('');

  // 对话框打开/关闭时重置状态
  useEffect(() => {
    if (open) {
      setMode('buy');
      setReceiver(null);
      setMessage('');
    }
  }, [open]);

  // 搜索用户函数（公开接口）
  const searchUsers = async (query) => {
    const res = await searchApi.search(query, 'users', 1, 5);
    if (res && res.users && Array.isArray(res.users.items)) {
      return res.users.items;
    } else if (res && Array.isArray(res.users)) {
      return res.users;
    }
    return [];
  };

  // 数据转换
  const transformUser = (user) => ({
    id: user.id,
    label: user.username || user.name,
    avatar: user.avatar,
  });

  // 自定义渲染搜索结果项（带头像）
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

  // 自定义渲染已选中状态（带头像和关闭按钮）
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
  const canAfford = balance >= item.price;
  
  const handleConfirm = () => {
    if (mode === 'gift') {
      if (!receiver) return;
      onConfirm({ isGift: true, receiverId: receiver.id, message });
    } else {
      onConfirm({}); // 普通购买
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onCancel}
      maxWidth="sm:max-w-[425px]"
      title="购买商品"
      description={item.name}
      footer={
        <DialogFooter className="shrink-0 p-6 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={purchasing}
          >
            取消
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={purchasing || !canAfford || (mode === 'gift' && !receiver)}
          >
            {purchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
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
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">自用购买</TabsTrigger>
            <TabsTrigger value="gift">赠送好友</TabsTrigger>
          </TabsList>
          
          <div className="mt-4 space-y-4">
             {/* 商品信息 */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {item.imageUrl && (
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {getItemTypeLabel(item.type)}
                </div>
              </div>
              <CreditsBadge amount={item.price} currencyCode={item.currencyCode} />
            </div>

            <TabsContent value="buy" className="mt-0 space-y-4">
              <div className="text-sm text-muted-foreground">
                购买后将直接发放到您的背包中。
              </div>
            </TabsContent>

            <TabsContent value="gift" className="mt-0 space-y-4">
              <SearchSelect
                value={receiver}
                onChange={setReceiver}
                searchFn={searchUsers}
                transformData={transformUser}
                renderItem={renderUserItem}
                renderSelected={renderSelectedUser}
                label="搜索用户"
                placeholder="输入用户名搜索..."
                autoSearch={true}
                debounceMs={500}
                emptyText="未找到相关用户"
              />
              
              {receiver && (
                <div className="space-y-2">
                  <Label>赠言 (可选)</Label>
                  <Textarea 
                    placeholder="写点什么..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                    className="resize-none"
                  />
                  <div className="text-xs text-right text-muted-foreground">{message.length}/200</div>
                </div>
              )}
            </TabsContent>

            {/* 余额信息 */}
            {(() => {
              const account = accounts.find(a => a.currency.code === item.currencyCode);
              const balance = account ? Number(account.balance) : 0;
              const canAfford = balance >= item.price;
              
              return (
                  <div className="flex items-center justify-between py-2 text-sm border-t">
                    <span className="text-muted-foreground">当前余额</span>
                    <div className="flex flex-col items-end">
                      <div className={canAfford ? 'font-medium' : 'font-medium text-destructive'}>
                        <CreditsBadge amount={balance} currencyCode={item.currencyCode} />
                      </div>
                      {!canAfford && <span className="text-xs text-destructive">余额不足</span>}
                    </div>
                  </div>
              );
            })()}
            
          </div>
        </Tabs>
    </FormDialog>
  );
}

