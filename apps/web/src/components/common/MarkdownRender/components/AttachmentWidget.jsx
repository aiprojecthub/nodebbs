'use client';

import { useEffect, useState } from 'react';
import { Coins, Download, Files, Loader2, Lock, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatFileSize } from '@/utils/format';
import {
  getAttachmentDownloadUrl,
  getAttachmentIcon,
  getPolicyBadge,
} from '@/utils/attachment';

/**
 * 正文中的 ::attachment{id} 渲染成的附件卡片。
 * 一条指令 = 一个附件组，组内可含多个文件，共用同一套下载权限。
 *
 * 权限判定全部在服务端（GET /api/attachments/:id 返回 canDownload / needPurchase），
 * 前端只负责按结果渲染动作区——即便有人伪造前端状态，下载路由仍会拦。
 *
 * 下载用原生 <a>：站内认证是 httpOnly Cookie 且 /api 同源代理，
 * 走浏览器原生下载可拿到进度条、断点续传，大文件也不占内存。
 */
export default function AttachmentWidget({ attachmentId }) {
  const { user } = useAuth();
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  const loadAttachment = () => {
    if (!attachmentId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    fetch(`/api/attachments/${attachmentId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || '加载失败');
        }
        return res.json();
      })
      .then((d) => {
        if (d) setAttachment(d);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttachment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentId, user?.id]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await fetch(`/api/attachments/${attachmentId}/purchase`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || '购买失败');
        return;
      }
      toast.success(data.amountPaid > 0 ? `已支付 ${data.amountPaid} 积分` : '已可下载');
      // 重新拉取以刷新 canDownload 与下载次数
      loadAttachment();
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="not-prose my-5 rounded-2xl px-5 py-4 bg-muted/30 animate-pulse flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-3 bg-muted rounded w-1/5"></div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="not-prose my-5 px-4 py-3 rounded-2xl bg-muted/40 text-muted-foreground text-sm flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        该附件已被删除
      </div>
    );
  }

  if (error) {
    return (
      <div className="not-prose my-5 px-4 py-3 rounded-2xl bg-destructive/5 text-destructive text-sm">
        附件加载失败：{error}
      </div>
    );
  }

  if (!attachment) return null;

  const files = attachment.files || [];
  // 单文件时卡片本身就代表那个文件，不再重复列一行
  const isSingle = files.length === 1;
  const HeaderIcon = isSingle
    ? getAttachmentIcon(files[0].mimetype, files[0].name)
    : Files;

  // 标识只在有下载权时给：没权限时右侧的购买按钮/受限提示已经说明了策略，
  // 再挂一个标识就是重复。'none' 无可标识，getPolicyBadge 返回 null
  const policyBadge = attachment.canDownload
    ? getPolicyBadge(attachment.policy, {
        purchased: attachment.purchased,
        pointsCost: attachment.pointsCost,
      })
    : null;

  return (
    <div className="not-prose my-5 rounded-2xl border border-border/60 bg-linear-to-br from-primary/5 via-primary/2 to-transparent px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
          <HeaderIcon className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-sm font-medium break-all">{attachment.title}</span>
            {policyBadge && <PolicyBadge badge={policyBadge} />}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            {!isSingle && (
              <>
                <span>{attachment.fileCount} 个文件</span>
                <span>·</span>
              </>
            )}
            <span>{formatFileSize(attachment.totalSize)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {attachment.downloadCount ?? 0} 次下载
            </span>
          </div>
          {attachment.description && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap break-words">
              {attachment.description}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {/* 有资格时：单文件在头部直接给下载按钮，多文件则由下方逐行给 */}
          {attachment.canDownload
            ? isSingle && <DownloadButton attachmentId={attachment.id} file={files[0]} />
            : (
              <AccessAction
                attachment={attachment}
                purchasing={purchasing}
                onPurchase={handlePurchase}
              />
            )}
        </div>
      </div>

      {!isSingle && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
          {files.map((f) => {
            const FileIcon = getAttachmentIcon(f.mimetype, f.name);
            return (
              <div key={f.fileId} className="flex items-center gap-2 py-1">
                <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(f.size)} · {f.downloadCount ?? 0} 次下载
                  </div>
                </div>
                {attachment.canDownload && (
                  <DownloadButton attachmentId={attachment.id} file={f} variant="ghost" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 附件的策略标识（已购买 / N 积分 / 登录·回复·角色受限）
 */
function PolicyBadge({ badge }) {
  const { Icon, label, variant } = badge;
  return (
    <Badge variant={variant} className="mt-0.5">
      <Icon />
      {label}
    </Badge>
  );
}

/**
 * 单个文件的下载按钮（原生 <a download>，Cookie 自动带上）
 */
function DownloadButton({ attachmentId, file, variant }) {
  return (
    <Button size="sm" variant={variant} asChild>
      <a href={getAttachmentDownloadUrl(attachmentId, file.fileId)} download>
        <Download className="h-4 w-4" />
        {variant === 'ghost' ? '' : '下载'}
      </a>
    </Button>
  );
}

/**
 * 无下载资格时的动作区：购买按钮或受限提示（组级别）
 */
function AccessAction({ attachment, purchasing, onPurchase }) {
  if (attachment.needPurchase) {
    return (
      <Button size="sm" onClick={onPurchase} disabled={purchasing}>
        {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
        {attachment.pointsCost} 积分下载
      </Button>
    );
  }

  // 与卡片标识共用同一套策略图标；'none' 走不到这里（它永远 canDownload）
  const HintIcon = getPolicyBadge(attachment.policy)?.Icon || Lock;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-40 text-right">
      <HintIcon className="h-3.5 w-3.5 shrink-0" />
      <span>{attachment.accessMessage || '暂无下载权限'}</span>
    </div>
  );
}
