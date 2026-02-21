'use client';
 
import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from 'next-themes';
import { CheckCircle2, Info, AlertTriangle, ShieldAlert } from 'lucide-react';

export function Toaster({ ...props }) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position='top-center'
      offset={60}
      className='toaster'
      toastOptions={{
        classNames: {
          toast:
            "!bg-background/80 !backdrop-blur-xl !text-foreground !border !border-border/40 !shadow-xs " +
            "data-[type=success]:!border-green-500/15 data-[type=success]:!bg-green-500/5 " +
            "data-[type=info]:!border-blue-500/15 data-[type=info]:!bg-blue-500/5 " +
            "data-[type=warning]:!border-orange-500/15 data-[type=warning]:!bg-orange-500/5 " +
            "data-[type=error]:!border-destructive/15 data-[type=error]:!bg-destructive/5 data-[type=error]:!text-destructive",
          description: "!text-muted-foreground font-medium",
          title: "font-semibold text-base",
          actionButton:
            "!bg-primary !text-primary-foreground font-medium rounded-lg shadow-sm hover:!bg-primary/90",
          cancelButton:
            "!bg-muted !text-muted-foreground font-medium rounded-lg hover:!bg-muted/80",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
        warning: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        error: <ShieldAlert className="h-5 w-5 text-destructive" />,
      }}
      {...props}
    />
  );
}