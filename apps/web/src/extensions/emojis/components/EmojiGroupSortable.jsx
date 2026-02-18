'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { GripVertical, Edit, Trash2, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from '@/components/common/Link';

function SortableItem({ group, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-4 bg-card border border-border rounded-lg',
        'transition-shadow',
        isDragging && 'shadow-lg opacity-90 z-50'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{group.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            {group.slug}
          </span>
          {!group.isActive && (
            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
              已停用
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
         {/* Manage Emojis Link */}
         <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/emojis/${group.id}`}>
               <LayoutGrid className="h-4 w-4" />
               表情管理
            </Link>
         </Button>

         <Button variant="ghost" size="icon" onClick={() => onEdit(group)}>
            <Edit className="h-4 w-4" />
         </Button>
         
         <Button 
            variant="ghost" 
            size="icon" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => onDelete(e, group)}  // 传递事件对象 e
         >
            <Trash2 className="h-4 w-4" />
         </Button>
      </div>
    </div>
  );
}

export default function EmojiGroupSortable({ groups, onReorder, onEdit, onDelete, loading }) {
  const [items, setItems] = useState(groups);

  useEffect(() => {
    setItems(groups);
  }, [groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
      
      // Notify parent
      const newOrder = newItems.map((item) => item.id);
      onReorder?.(newOrder);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无表情分组，请点击右上角创建。
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
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((group) => (
            <SortableItem 
               key={group.id} 
               group={group} 
               onEdit={onEdit} 
               onDelete={onDelete} 
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
