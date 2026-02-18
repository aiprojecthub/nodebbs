'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

function SortableEmojiItem({ emoji, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: emoji.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    // 防止拖动时选中文本，但允许页面滚动（touchAction 只在拖拽手柄上禁用）
    userSelect: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group flex flex-col items-center justify-between p-2 bg-card border border-border rounded-lg min-h-[100px]',
        'hover:border-primary/50 hover:shadow-sm',
        isDragging && 'shadow-lg opacity-50 z-50 scale-105'
      )}
    >
      {/* 拖拽手柄：只有这个区域可以拖动，避免整个卡片都是拖拽区域 */}
      <div 
        className="absolute top-1 left-1 p-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 flex items-center justify-center py-2 h-16 w-full">
         <img 
            src={emoji.url} 
            alt={emoji.code}
            className="w-10 h-10 object-contain pointer-events-none select-none"
            draggable={false}
         />
      </div>
      
      <div className="w-full text-[10px] text-muted-foreground font-mono text-center break-all leading-tight px-1 pb-1 truncate">
        {emoji.code}
      </div>

      {/* 删除按钮：移动端始终可见，桌面端悬停显示 */}
      <button
        onClick={(e) => {
           e.stopPropagation(); // 阻止冒泡
           e.preventDefault();
           onDelete(emoji);
        }}
        className="absolute top-1 right-1 p-1.5 bg-destructive/10 text-destructive rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-background"
        title="删除表情"
        data-no-dnd="true"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      
      {/* 序号标记（调试用） */}
      {/* <div className="absolute top-1 left-1 text-[10px] text-muted-foreground opacity-50">
         {emoji.order}
      </div> */}
    </div>
  );
}

export default function EmojiListSortable({ emojis, onReorder, onDelete }) {
  const [items, setItems] = useState(emojis);

  useEffect(() => {
    setItems(emojis);
  }, [emojis]);

  const sensors = useSensors(
    // 鼠标/指针传感器：需要移动 8px 才激活拖拽
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    // 触摸传感器：需要长按 250ms 才激活拖拽，防止与滚动冲突
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      
      setItems(newItems);
      
      const newOrder = newItems.map((item) => item.id);
      onReorder?.(newOrder);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        暂无表情，请上传
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
          {items.map((emoji) => (
            <SortableEmojiItem 
               key={emoji.id} 
               emoji={emoji} 
               onDelete={onDelete} 
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
