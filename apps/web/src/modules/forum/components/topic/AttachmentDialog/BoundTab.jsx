'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Download, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/utils/format';
import { getAttachmentIcon, getPolicyLabel } from '@/utils/attachment';

/**
 * 「本话题已有」Tab：编辑已发布话题时，把已绑附件重新插回正文。
 *
 * @param {object} props
 * @param {number} props.topicId
 * @param {(attachmentId:number)=>void} props.onInsert
 */
export default function BoundTab({ topicId, onInsert }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/attachments/topic/${topicId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || '加载失败');
        }
        return res.json();
      })
      .then((d) => {
        if (cancelled) return;
        setAttachments(d.attachments ?? []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground text-center">加载中…</div>;
  }
  if (error) {
    return <div className="py-8 text-sm text-destructive text-center">{error}</div>;
  }
  if (attachments.length === 0) {
    return (
      <div className="py-8 text-sm text-muted-foreground text-center">
        本话题暂无已绑附件。
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-2">
      {attachments.map((a) => {
        const Icon =
          a.fileCount === 1
            ? getAttachmentIcon(a.files[0]?.mimetype, a.files[0]?.name)
            : Files;
        return (
          <div key={a.id} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span>{a.fileCount} 个文件</span>
                  <span>·</span>
                  <span>{formatFileSize(a.totalSize)}</span>
                  <span>·</span>
                  <span>{getPolicyLabel(a.policy)}</span>
                  <span>·</span>
                  <Download className="h-3 w-3" />
                  <span>{a.downloadCount ?? 0} 次下载</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => onInsert?.(a.id)}>
                <ArrowRight className="h-3 w-3" /> 重新插入正文
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
