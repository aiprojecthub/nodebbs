'use client';

import Link from '@/components/common/Link';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertCircle } from 'lucide-react';
import UserAvatar from '@/components/user/UserAvatar';
import Time from '@/components/common/Time';
import CopyButton from '@/components/common/CopyButton';
import { toast } from 'sonner';

/**
 * 回复头部：头像 + 用户名 + 徽章 + 时间 + 楼层号
 * 原子组件
 *
 * @param {Object} props
 * @param {Object} props.reply - 回复数据
 * @param {string} props.topicId - 话题ID
 * @param {string} props.origin - 页面 origin（用于复制链接）
 * @param {boolean} props.isPending - 是否待审核
 * @param {boolean} props.isRejected - 是否已拒绝
 */
export default function ReplyHeader({ reply, topicId, origin, isPending, isRejected }) {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div className='flex items-start gap-3'>
        <Link href={`/users/${reply.username}`} className="shrink-0 mt-0.5">
          <UserAvatar url={reply.userAvatar} name={reply.userName} size='md' frameMetadata={reply.userAvatarFrame?.itemMetadata} />
        </Link>
        <div className='flex flex-col gap-0.5 min-w-0'>
          <div className='flex items-center gap-1.5 text-sm'>
            <Link href={`/users/${reply.username}`} className='font-medium text-foreground hover:underline decoration-primary/50 underline-offset-4 truncate'>
              {reply.userName || reply.userUsername}
            </Link>
            {reply.userDisplayRole && (
              <Badge variant="secondary" className="px-1.5 h-4 text-[10px] font-normal bg-primary/10 text-primary border-0 rounded shrink-0">{reply.userDisplayRole.name}</Badge>
            )}
            {reply.topicUserId === reply.userId && (
              <Badge variant="secondary" className="px-1.5 h-4 text-[10px] font-normal bg-primary/5 text-primary/70 border-0 rounded shrink-0">楼主</Badge>
            )}
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground/70 flex-wrap leading-none'>
            <Time date={reply.createdAt} fromNow />
            {reply.editedAt && <span className="text-muted-foreground/50" title={`已编辑 ${reply.editCount || 1} 次`}>(已编辑)</span>}
            {isPending && <Badge variant="outline" className="px-1.5 h-4 text-[10px] font-normal text-chart-5 border-chart-5/30 gap-1 rounded"><Clock className='h-2.5 w-2.5' /> 审核中</Badge>}
            {isRejected && <Badge variant="outline" className="px-1.5 h-4 text-[10px] font-normal text-destructive border-destructive/30 gap-1 rounded"><AlertCircle className='h-2.5 w-2.5' /> 已拒绝</Badge>}
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <CopyButton
          value={`${origin}/topic/${topicId}#post-${reply.id}`}
          className="h-8 px-2 text-xs sm:text-base font-bold text-muted-foreground/30 hover:text-primary hover:cursor-pointer font-mono hover:bg-transparent transition-colors"
          variant="ghost"
          onCopy={() => toast.success('链接已复制')}
        >
          {({ copied }) => (<><span className="sr-only">复制链接</span>{copied ? <Check className="h-5 w-5 text-green-500" /> : <>#{reply.postNumber}</>}</>)}
        </CopyButton>
      </div>
    </div>
  );
}
