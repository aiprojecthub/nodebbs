'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Loader2, MessageSquare, Eye } from 'lucide-react';
import { usePrivacySettings } from '@/hooks/profile/usePrivacySettings';

/**
 * 隐私设置 Tab
 * 内部使用 usePrivacySettings Hook 管理状态
 */
export function PrivacyTab() {
  const {
    formData,
    updateField,
    handleSubmit,
    loading,
  } = usePrivacySettings();

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='bg-card border border-border rounded-lg overflow-hidden'>
        <div className='px-4 py-3 bg-muted border-b border-border'>
          <h3 className='text-sm font-medium text-card-foreground'>
            站内信设置
          </h3>
        </div>
        <div className='p-6 space-y-6'>
          <div className='flex items-center justify-between'>
            <div className='flex-1 mr-4'>
              <div className='flex items-center space-x-2 mb-1'>
                <MessageSquare className='h-4 w-4 text-muted-foreground' />
                <Label className='text-sm font-medium text-card-foreground'>
                  站内信权限
                </Label>
              </div>
              <p className='text-xs text-muted-foreground'>
                控制谁可以给你发送站内信
              </p>
            </div>
            <Select
              value={formData.messagePermission}
              onValueChange={(value) => updateField('messagePermission', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择">
                  {formData.messagePermission === 'everyone' && '所有已登录用户'}
                  {formData.messagePermission === 'followers' && '关注我的用户'}
                  {formData.messagePermission === 'disabled' && '禁用'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='everyone'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>所有已登录用户</span>
                    <span className='text-xs text-muted-foreground'>
                      任何登录用户都可以给你发站内信
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='followers'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>关注我的用户</span>
                    <span className='text-xs text-muted-foreground'>
                      只有关注你的用户可以发站内信
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='disabled'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>禁用</span>
                    <span className='text-xs text-muted-foreground'>
                      不接收任何站内信
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center justify-between'>
            <div className='flex-1 mr-4'>
              <div className='flex items-center space-x-2 mb-1'>
                <Eye className='h-4 w-4 text-muted-foreground' />
                <Label className='text-sm font-medium text-card-foreground'>
                  话题/回复查看权限
                </Label>
              </div>
              <p className='text-xs text-muted-foreground'>
                控制谁可以在你的个人主页查看你发布的话题和回复
              </p>
            </div>
            <Select
              value={formData.contentVisibility}
              onValueChange={(value) => updateField('contentVisibility', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择">
                  {formData.contentVisibility === 'everyone' && '所有人'}
                  {formData.contentVisibility === 'authenticated' && '登录用户'}
                  {formData.contentVisibility === 'private' && '仅自己'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='everyone'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>所有人</span>
                    <span className='text-xs text-muted-foreground'>
                      任何人都可以查看你的话题和回复
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='authenticated'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>登录用户</span>
                    <span className='text-xs text-muted-foreground'>
                      只有登录用户可以查看
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value='private'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>仅自己</span>
                    <span className='text-xs text-muted-foreground'>
                      只有你自己可以查看
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 保存按钮 */}
      <div className='flex items-center justify-end'>
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
  );
}
