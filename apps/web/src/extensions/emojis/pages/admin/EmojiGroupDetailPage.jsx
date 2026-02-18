'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Loader2, Upload, LayoutGrid } from 'lucide-react';
import { emojiApi } from '@/lib/api';
import { toast } from 'sonner';
import EmojiListSortable from '../../components/EmojiListSortable';
import EmojiUpload from '../../components/EmojiUpload';
import { cn } from '@/lib/utils';

export default function EmojiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.id);

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      const data = await emojiApi.admin.getGroup(groupId);
      setGroup(data);
    } catch (err) {
      console.error('获取数据失败:', err);
      if (err.message?.includes('不存在')) {
        toast.error('分组不存在');
        router.push('/dashboard/emojis');
      } else {
        toast.error('获取数据失败');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    if (!isNaN(groupId)) {
      fetchGroupData();
    }
  }, [groupId, fetchGroupData]);

  // 手动刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroupData();
    setRefreshing(false);
  };

  // 删除表情（本地乐观更新）
  const handleDelete = async (emoji) => {
    try {
      await emojiApi.admin.deleteEmoji(emoji.id);
      toast.success('表情删除成功');
      setGroup(prev => ({
        ...prev,
        emojis: prev.emojis.filter(e => e.id !== emoji.id)
      }));
    } catch (err) {
      toast.error('删除失败');
    }
  };

  // 拖拽排序（乐观更新，失败时回滚）
  const handleReorder = async (newOrder) => {
    const newEmojis = newOrder.map(id => group.emojis.find(e => e.id === id)).filter(Boolean);
    setGroup(prev => ({ ...prev, emojis: newEmojis }));

    setReordering(true);
    try {
      const items = newOrder.map((id, index) => ({
        id,
        groupId,
        order: index
      }));
      await emojiApi.admin.batchReorder(items);
      toast.success('排序已保存');
    } catch (err) {
      toast.error('排序保存失败');
      fetchGroupData();
    } finally {
      setReordering(false);
    }
  };

  // 初始加载
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="space-y-6">
      {/* 页头：返回、分组信息、刷新 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">
            {group.emojis?.length || 0} 个表情 · {group.slug}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          刷新
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        {/* 上传区域 */}
        <div className="">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            上传表情
          </h3>
          <EmojiUpload
            groupId={groupId}
            onUploadSuccess={fetchGroupData}
          />
        </div>

        {/* 表情列表 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              表情列表
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (共 {group.emojis?.length || 0} 个)
              </span>
            </h3>
            {reordering && <span className="text-sm text-muted-foreground animate-pulse">保存排序中...</span>}
          </div>

          <div className="bg-muted/30 border rounded-lg p-6 min-h-[200px]">
            <EmojiListSortable
              emojis={group.emojis || []}
              onReorder={handleReorder}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
