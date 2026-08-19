'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Files, Loader2, Pencil, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { formatFileSize } from '@/utils/format';
import { getAttachmentIcon, getPolicyLabel } from '@/utils/attachment';

const LIMIT = 20;

/**
 * 「草稿」Tab：当前用户尚未绑定到任何话题的附件，可插入 / 编辑 / 删除。
 *
 * @param {object} props
 * @param {number} props.refreshKey - 父组件递增以触发刷新
 * @param {(attachmentId:number)=>void} props.onInsert
 * @param {(draft:object)=>void} props.onEdit
 */
export default function DraftsTab({ refreshKey, onInsert, onEdit }) {
  const [drafts, setDrafts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/attachments/drafts?page=${page}&limit=${LIMIT}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || '加载草稿失败');
        }
        return res.json();
      })
      .then((d) => {
        if (cancelled) return;
        setDrafts(d.drafts ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/attachments/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || '删除失败');
        return;
      }
      toast.success('草稿已删除');
      setDrafts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTarget(null);
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && drafts.length === 0) {
    return <div className="py-8 text-sm text-muted-foreground text-center">加载中…</div>;
  }
  if (error) {
    return <div className="py-8 text-sm text-destructive text-center">{error}</div>;
  }
  if (drafts.length === 0) {
    return (
      <div className="py-8 text-sm text-muted-foreground text-center">
        还没有草稿。去『上传』Tab 添加第一个附件吧。
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="pt-4 space-y-2">
      {drafts.map((d) => {
        const Icon =
          d.fileCount === 1
            ? getAttachmentIcon(d.files[0]?.mimetype, d.files[0]?.name)
            : Files;
        return (
          <div key={d.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.fileCount} 个文件
                  {' · '}
                  {formatFileSize(d.totalSize)}
                  {' · '}
                  {getPolicyLabel(d.policy)}
                  {d.policy === 'points' && ` · ${d.pointsCost} 积分`}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => onInsert?.(d.id)}>
                <ArrowRight className="h-3 w-3" /> 插入
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit?.(d)}>
                <Pencil className="h-3 w-3" /> 编辑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(d)}
              >
                <Trash2 className="h-3 w-3" /> 删除
              </Button>
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>共 {total} 条 · 第 {page} / {totalPages} 页</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              上一页
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              下一页
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除草稿</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.title}」？组内 {deleteTarget?.fileCount} 个文件会被一并删除，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
