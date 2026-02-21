'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, ShieldOff, Loader2 } from 'lucide-react';
import { blockedUsersApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function BlockUserButton({ userId, username }) {
  const { isAuthenticated, user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);

  // 检查拉黑状态
  useEffect(() => {
    if (isAuthenticated && user) {
      checkBlockStatus();
    } else {
      setChecking(false);
    }
  }, [isAuthenticated, user, userId]);

  const checkBlockStatus = async () => {
    try {
      const result = await blockedUsersApi.check(userId);
      setIsBlocked(result.blockedByMe || false);
    } catch (err) {
      console.error('检查拉黑状态失败:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);

    try {
      await blockedUsersApi.block(userId);
      setIsBlocked(true);
      toast.success(`已拉黑 ${username}`);
      setShowBlockDialog(false);
    } catch (err) {
      console.error('拉黑失败:', err);
      toast.error(err.message || '拉黑失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);

    try {
      await blockedUsersApi.unblock(userId);
      setIsBlocked(false);
      toast.success(`已取消拉黑 ${username}`);
      setShowUnblockDialog(false);
    } catch (err) {
      console.error('取消拉黑失败:', err);
      toast.error(err.message || '取消拉黑失败');
    } finally {
      setLoading(false);
    }
  };

  // 如果是自己，不显示按钮
  if (user && user.id === userId) {
    return null;
  }

  // 如果未登录，不显示按钮
  if (!isAuthenticated) {
    return null;
  }

  // 如果正在检查状态，显示加载状态
  if (checking) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        检查中...
      </Button>
    );
  }

  return (
    <>
      {isBlocked ? (
        <Button
          variant="outline"
          className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => setShowUnblockDialog(true)}
        >
          <ShieldOff className="h-4 w-4" />
          已拉黑
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowBlockDialog(true)}
        >
          <Shield className="h-4 w-4" />
          拉黑用户
        </Button>
      )}

      {/* 拉黑确认对话框 */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认拉黑用户？</AlertDialogTitle>
            <AlertDialogDescription>
              拉黑 {username} 后：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>你们将无法互相发送站内信</li>
                <li>对方将无法查看你的动态</li>
                <li>你可以随时取消拉黑</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  拉黑中...
                </>
              ) : (
                '确认拉黑'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 取消拉黑确认对话框 */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消拉黑？</AlertDialogTitle>
            <AlertDialogDescription>
              取消拉黑 {username} 后，你们将可以正常互动。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                '确认取消'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
