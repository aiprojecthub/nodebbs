import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitText = '保存',
  cancelText = '取消',
  onSubmit,
  loading = false,
  maxWidth = 'sm:max-w-[425px]',
  disabled = false,
  submitClassName = '',
  footer = undefined, // Custom footer content. Pass null to hide footer.
  onInteractOutside,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 
        覆盖 DialogContent 样式：
        - 移除默认 grid 和 gap，改用 flex 布局
        - 移除默认 p-6，由子组件自行处理 padding
        - 添加 max-h 限制高度
      */}
      <DialogContent 
        className={`${maxWidth} flex flex-col`}
        style={{ 
          maxHeight: 'calc(100dvh - 2rem)',
          padding: 0,
          gap: 0,
        }}
        onInteractOutside={onInteractOutside}
      >
        {/* Header 区域：固定不滚动 */}
        <DialogHeader className="shrink-0 p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {/* Body 区域：可滚动，当无 footer 时添加底部间距 */}
        {/* min-h-0 是 Safari flexbox 滚动兼容性必需的 */}
        <div className={`flex-1 min-h-0 overflow-y-auto px-6 ${footer === null ? 'pb-6' : ''}`}>
          {children}
        </div>

        {/* Footer 区域：固定不滚动 */}
        {footer === undefined ? (
          <DialogFooter className="shrink-0 p-6 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {cancelText}
            </Button>
            {onSubmit && (
              <Button
                  onClick={onSubmit}
                  disabled={loading || disabled}
                  className={submitClassName}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitText}
              </Button>
            )}
          </DialogFooter>
        ) : (
            footer
        )}
      </DialogContent>
    </Dialog>
  );
}
