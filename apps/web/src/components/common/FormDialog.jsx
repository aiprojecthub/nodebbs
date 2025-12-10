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
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        {children}

        {footer === undefined ? (
          <DialogFooter>
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
