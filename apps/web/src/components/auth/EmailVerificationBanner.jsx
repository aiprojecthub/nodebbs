'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { Mail, X } from 'lucide-react';
import { EmailVerificationDialog } from './EmailVerificationDialog';

/**
 * 邮箱验证提示横幅 - 使用验证码方式
 * 当系统要求邮箱验证且用户未验证邮箱时显示
 */
export default function EmailVerificationBanner() {
  const { user, checkAuth } = useAuth();
  const { getSetting, loading: settingsLoading } = useSettings();
  const [isVisible, setIsVisible] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  const emailVerificationRequired = getSetting('email_verification_required', false);

  // 如果正在加载、用户未登录、已验证邮箱、没有邮箱、系统未要求验证或横幅已关闭，不显示
  if (settingsLoading || !user || !user.email || user.isEmailVerified || !emailVerificationRequired || !isVisible) {
    return null;
  }

  // 验证成功后的回调
  const handleVerified = async () => {
    await checkAuth(); // 刷新用户信息
    setIsVisible(false); // 隐藏横幅
  };

  return (
    <>
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800'>
        <div className='container mx-auto px-4 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 flex-1'>
              <Mail className='h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0' />
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                您的邮箱 ({user.email}) 尚未验证。请验证邮箱以使用完整功能。
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setShowDialog(true)}
                className='border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
              >
                <Mail className='h-4 w-4 mr-1' />
                验证邮箱
              </Button>
              <Button
                size='sm'
                variant='ghost'
                onClick={() => setIsVisible(false)}
                className='hover:bg-yellow-100 dark:hover:bg-yellow-900/40'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 邮箱验证对话框 */}
      <EmailVerificationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        user={user}
        onVerified={handleVerified}
      />
    </>
  );
}
