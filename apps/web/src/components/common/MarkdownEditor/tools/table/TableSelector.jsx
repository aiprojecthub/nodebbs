import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// 表格选择器组件
export const TableSelector = ({ onConfirm, disabled, title, Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);

  const MAX_ROWS = 6;
  const MAX_COLS = 8;

  const handleSelect = (r, c) => {
    onConfirm(r, c);
    setIsOpen(false);
    setHoverRows(0);
    setHoverCols(0);
  };

  const reset = () => {
    setHoverRows(0);
    setHoverCols(0);
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if(!open) reset();
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={title}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center mb-1">
             <span className="text-sm font-medium">插入表格</span>
             <span className="text-xs text-muted-foreground">{hoverRows > 0 ? `${hoverRows}行 x ${hoverCols}列` : '选择尺寸'}</span>
          </div>
          <div 
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
            onMouseLeave={reset}
          >
            {Array.from({ length: MAX_ROWS }).map((_, r) => (
              Array.from({ length: MAX_COLS }).map((_, c) => {
                 const row = r + 1;
                 const col = c + 1;
                 const isActive = row <= hoverRows && col <= hoverCols;
                 return (
                   <div
                     key={`${row}-${col}`}
                     className={cn(
                       "w-5 h-5 border rounded-sm cursor-pointer transition-colors",
                       isActive ? "bg-primary border-primary" : "bg-muted border-border hover:border-primary/50"
                     )}
                     onMouseEnter={() => {
                       setHoverRows(row);
                       setHoverCols(col);
                     }}
                     onClick={() => handleSelect(row, col)}
                   />
                 );
              })
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
