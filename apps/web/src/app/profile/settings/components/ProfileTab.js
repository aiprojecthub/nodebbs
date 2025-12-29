'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/user/UserAvatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Mail,
  Calendar,
  Upload,
  Save,
  Loader2,
  Edit,
  Share2,
} from 'lucide-react';
import Time from '@/components/common/Time';
import { useProfileInfo } from '@/hooks/profile/useProfileInfo';
import { useUsernameChange } from '@/hooks/profile/useUsernameChange';
import { useEmailChange } from '@/hooks/profile/useEmailChange';
import { useSettings } from '@/contexts/SettingsContext';
import { UsernameChangeDialog } from './UsernameChangeDialog';
import { EmailChangeDialog } from './EmailChangeDialog';

/**
 * 个人资料 Tab
 * 内部管理表单状态，消费 useProfileInfo Hook
 */
export function ProfileTab() {
  const fileInputRef = useRef(null);
  const { settings } = useSettings();

  // 使用独立 Hooks
  const {
    user,
    formData,
    updateField,
    resetForm,
    handleAvatarChange,
    handleSubmit,
    loading,
    uploadingAvatar,
  } = useProfileInfo();

  const usernameChange = useUsernameChange();
  const emailChange = useEmailChange();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  if (!user) return null;

  return (
    <>
      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* 个人资料 */}
        <div className='bg-card border border-border rounded-lg overflow-hidden'>
          <div className='px-4 py-3 bg-muted border-b border-border'>
            <h3 className='text-sm font-medium text-card-foreground'>
              个人资料
            </h3>
          </div>
          <div className='p-6 space-y-6'>
            {/* 头像 */}
            <div className='flex items-start space-x-4'>
              <UserAvatar url={formData.avatar} name={user.username} size="xl" />
              <div className='flex-1'>
                <Label className='text-sm font-medium text-card-foreground block mb-2'>
                  头像
                </Label>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleAvatarChange}
                  className='hidden'
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className='h-4 w-4' />
                      上传新头像
                    </>
                  )}
                </Button>
                <p className='text-xs text-muted-foreground mt-2'>
                  推荐尺寸：200x200px，支持 JPG、PNG 格式，最大 5MB
                </p>
              </div>
            </div>

            {/* 用户名 */}
            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                用户名
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  type='text'
                  value={user.username}
                  disabled
                  className='bg-muted flex-1'
                />
                {settings.allow_username_change?.value && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={usernameChange.openDialog}
                    disabled={!usernameChange.usernameInfo?.canChange}
                  >
                    <Edit className='h-4 w-4' />
                    修改
                  </Button>
                )}
              </div>
              {settings.allow_username_change?.value ? (
                <p className='text-xs text-muted-foreground mt-1'>
                  {usernameChange.usernameInfo?.canChange ? (
                    <>
                      {usernameChange.usernameInfo.remainingChanges >= 0
                        ? `剩余修改次数：${usernameChange.usernameInfo.remainingChanges}次`
                        : '可修改'}
                      {usernameChange.usernameInfo.cooldownDays > 0 &&
                        ` · 冷却期：${usernameChange.usernameInfo.cooldownDays}天`}
                    </>
                  ) : usernameChange.usernameInfo?.nextAvailable ? (
                    `下次可修改时间：${usernameChange.usernameInfo.nextAvailable.toLocaleDateString('zh-CN')}`
                  ) : (
                    '已达到修改次数上限'
                  )}
                </p>
              ) : (
                <p className='text-xs text-muted-foreground mt-1'>
                  用户名不可修改
                </p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                <Mail className='h-4 w-4 inline mr-1' />
                邮箱地址
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  type='email'
                  value={user.email}
                  disabled
                  className='bg-muted flex-1'
                />
                {user.isEmailVerified ? (
                  <Badge variant='success' className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                    已验证
                  </Badge>
                ) : (
                  <Badge variant='warning' className='bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'>
                    未验证
                  </Badge>
                )}
                {settings.allow_email_change?.value && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={emailChange.openDialog}
                  >
                    <Edit className='h-4 w-4' />
                    修改
                  </Button>
                )}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {settings.allow_email_change?.value
                  ? '可修改邮箱地址'
                  : '邮箱不可修改'}
              </p>
            </div>

            {/* 姓名 */}
            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                姓名 *
              </Label>
              <Input
                type='text'
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder='请输入姓名'
                required
              />
            </div>

            {/* 个人简介 */}
            <div>
              <Label className='text-sm font-medium text-card-foreground block mb-2'>
                个人简介
              </Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                rows={3}
                placeholder='介绍一下你自己...'
                className='resize-none'
              />
            </div>
          </div>
        </div>

        {/* 账户信息 */}
        <div className='bg-card border border-border rounded-lg overflow-hidden'>
          <div className='px-4 py-3 bg-muted border-b border-border'>
            <h3 className='text-sm font-medium text-card-foreground'>
              账户信息
            </h3>
          </div>
          <div className='p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <Calendar className='h-4 w-4' />
                <span>加入时间</span>
              </div>
              <span className='text-sm text-card-foreground'>
                <Time date={user.createdAt} />
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <User className='h-4 w-4' />
                <span>用户ID</span>
              </div>
              <Badge variant='secondary'>#{user.id}</Badge>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <User className='h-4 w-4' />
                <span>用户角色</span>
              </div>
              <Badge variant='outline'>
                {user.role === 'admin'
                  ? '管理员'
                  : user.role === 'moderator'
                  ? '版主'
                  : '用户'}
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                <Share2 className='h-4 w-4' />
                <span>关联账号</span>
              </div>
              <div className='flex gap-2'>
                {user.oauthProviders && user.oauthProviders.length > 0 ? (
                  user.oauthProviders.map((provider) => (
                    <Badge key={provider} variant='secondary' className="capitalize">
                      {provider}
                    </Badge>
                  ))
                ) : (
                  <span className='text-sm text-muted-foreground'>未关联</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className='flex items-center justify-end space-x-3'>
          <Button type='button' variant='outline' onClick={resetForm}>
            重置
          </Button>
          <Button type='submit' disabled={loading}>
            {loading ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                保存中...
              </>
            ) : (
              <>
                <Save className='h-4 w-4' />
                保存设置
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 用户名修改对话框 */}
      <UsernameChangeDialog
        open={usernameChange.showDialog}
        onOpenChange={usernameChange.setShowDialog}
        usernameChange={usernameChange}
      />

      {/* 邮箱修改对话框 */}
      <EmailChangeDialog
        open={emailChange.showDialog}
        onOpenChange={emailChange.setShowDialog}
        emailChange={emailChange}
      />
    </>
  );
}
