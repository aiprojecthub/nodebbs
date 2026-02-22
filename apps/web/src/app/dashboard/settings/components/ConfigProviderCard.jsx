'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConfigProviderCard({
  title,
  description,
  icon: Icon,
  isEnabled,
  isEditing,
  onToggleEnabled,
  onEditClick,
  onCancelClick,
  children,
  summary,
  className,
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 w-full max-w-4xl shadow-none",
        isEditing
          ? "ring-2 ring-primary/10 border-primary/50 bg-card"
          : "hover:border-primary/30 bg-card/50",
        className
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Header Left */}
          <div className={cn("flex gap-4 flex-1", description ? "items-start" : "items-center")}>
            {Icon && (
              <div className={cn(
                "p-2.5 rounded-xl transition-colors",
                description && "mt-0.5",
                isEnabled
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base leading-none">{title}</h3>
                {isEnabled && (
                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 border-green-200/50 dark:border-green-800/50">
                    已启用
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[90%]">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Header Right */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {onEditClick && (
              <>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  variant={isEditing ? "ghost" : "outline"}
                  size="icon"
                  onClick={isEditing ? onCancelClick : onEditClick}
                  className={cn(
                    "h-8 w-8 transition-all duration-200",
                    isEditing
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive active:scale-95"
                      : "active:scale-95"
                  )}
                >
                  {isEditing ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Summary (Show when NOT editing and has summary) */}
        {!isEditing && summary && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-dashed border-border/60"
          >
            <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2.5 rounded-md">
              {summary}
            </div>
          </motion.div>
        )}
      </div>

      {/* Editing Form (Collapsible) */}
      <AnimatePresence initial={false}>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, type: "spring", bounce: 0, opacity: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-5 pt-0">
              <div className="pt-5 border-t border-border/60">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
