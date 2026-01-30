'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, EyeOff, Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MarkdownRender from '@/components/common/MarkdownRender';
import { useEditorCore } from './hooks/useEditorCore';
import { ToolRegistry } from './tools';
import { useImageUpload } from './tools/image/useImageUpload';

// 默认工具栏配置
const DEFAULT_TOOLBAR = [
  'heading', '|',
  'bold', 'italic', 'strike',
  '|',
  'code', 'quote', 'codeBlock',
  '|',
  'bulletList', 'orderedList', 'checklist',
  '|',
  'horizontalRule',
  '|',
  'link', 'image', 'video', 'audio', 'table'
];

/**
 * MarkdownEditor - 模块化重构版
 */
export default function MarkdownEditor({ 
  value = '', 
  onChange, 
  className, 
  editorClassName,
  placeholder = '开始编辑...',
  toolbar = DEFAULT_TOOLBAR,
  disabled = false,
  minimal = false,
  onUpload,
  uploadType = 'topics',
  ...props
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!minimal);
  const textareaRef = useRef(null);

  // 初始化核心编辑能力
  const editorCore = useEditorCore(onChange, textareaRef);

  // 初始化全局级的上传处理 (主要用于处理粘贴和拖拽事件)
  // 注意：工具栏按钮的上传逻辑封装在 ImageTool 内部，这里处理的是编辑器的全局事件
  const { handlePaste, handleDrop } = useImageUpload({
    onUpload,
    uploadType,
    insertBlock: editorCore.insertBlock,
    onChange,
    textareaRef
  });

  // 监听 minimal 属性变化
  useEffect(() => {
    if (!minimal) {
      setIsExpanded(true);
    }
  }, [minimal]);

  const showToolbar = isExpanded || !minimal;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 工具栏 */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border border-b-0 rounded-tl-lg rounded-tr-lg bg-muted/30">
          <div className="flex items-center gap-1 flex-wrap">
            {toolbar.map((item, index) => {
              if (item === '|') {
                return <div key={index} className="w-px h-6 bg-border mx-1" />;
              }

              const ToolComponent = ToolRegistry[item];
              if (!ToolComponent) return null;

              return (
                <ToolComponent 
                  key={item}
                  editor={editorCore}
                  disabled={isPreviewMode || disabled}
                  config={{ 
                    // 传递给工具的全局配置
                    onUpload, 
                    uploadType,
                    textareaRef,
                    onChange 
                  }}
                />
              );
            })}
          </div>

          {/* 视图切换 */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={isPreviewMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="h-8 gap-2 text-xs"
              disabled={disabled}
            >
              {isPreviewMode ? (
                <>
                  <EyeOff className="h-4 w-4" /> 源码
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" /> 预览
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="bg-card flex-1 relative group">
        {/* 触发展开的按钮 */}
        {(minimal && !isExpanded) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 transition"
            onClick={() => setIsExpanded(true)}
            title="使用富文本编辑器"
            disabled={disabled}
          >
            <Type className="h-4 w-4" />
          </Button>
        )}

        {isPreviewMode ? (
          <article 
            className={cn(
              'min-h-[300px] lg:max-h-[calc(100vh-430px)] overflow-y-auto p-4 border rounded-lg max-w-none prose prose-stone dark:prose-invert break-all',
              showToolbar && 'rounded-tl-none rounded-tr-none',
              editorClassName
            )}
          >
            <MarkdownRender content={value || ''} />
          </article>
        ) : (
          <Textarea
            ref={textareaRef}
            {...props}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            onPaste={handlePaste}
            onDrop={handleDrop}
            className={cn(
              'min-h-[300px] max-h-[50vh] lg:max-h-[calc(100vh-430px)] resize-none overflow-y-auto field-sizing-fixed sm:field-sizing-content break-all',
              showToolbar ? 'rounded-tl-none rounded-tr-none' : 'rounded-lg',
              editorClassName
            )}
          />
        )}
      </div>
    </div>
  );
}
