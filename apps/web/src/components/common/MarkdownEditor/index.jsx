'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Quote, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Eye,
  EyeOff,
  Check,
  X,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading,
  ChevronDown,
  Table as TableIcon,
  ListTodo,
  Minus,
  FileCode,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MarkdownRender from '@/components/common/MarkdownRender';

// 表格选择器组件
const TableSelector = ({ onConfirm, disabled, title, Icon }) => {
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

// 插入弹窗组件
const InsertForm = ({ title, placeholder, onConfirm, Icon, disabled }) => {
  const [url, setUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (url.trim()) {
      onConfirm(url);
      setUrl('');
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
      <PopoverContent className="w-80 p-3" align="start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <h4 className="font-medium leading-none text-sm mb-1">插入{title}</h4>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={placeholder || "请输入链接地址"}
              className="h-8 text-sm"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8 px-2">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

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
 * MarkdownEditor - 可配置的 Markdown 编辑器
 * @param {string} value - 编辑器内容
 * @param {function} onChange - 内容变更回调
 * @param {string} className - 容器类名
 * @param {string} editorClassName - 编辑区域（Textarea）类名
 * @param {string} placeholder - 占位符
 * @param {Array} toolbar - 工具栏配置
 * @param {boolean} disabled - 是否禁用
 * @param {boolean} minimal - 是否启用极简模式（默认收起工具栏）
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
  ...props
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!minimal);
  const textareaRef = useRef(null);

  // 监听 minimal 属性变化
  useEffect(() => {
    if (!minimal) {
      setIsExpanded(true);
    }
  }, [minimal]);

  // 文本操作辅助函数
  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop; // 保存滚动位置
    const text = textarea.value;
    const selection = text.substring(start, end);
    const replacement = before + selection + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange?.(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
      textarea.scrollTop = scrollTop; // 恢复滚动位置
    }, 0);
  };

  const insertBlock = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = textarea.value;
    const isStartOfLine = start === 0 || text[start - 1] === '\n';
    const insertion = isStartOfLine ? prefix : '\n' + prefix;
    
    insertText(insertion);
  };

  // 事件处理函数
  const handlers = {
    // ... 基础处理函数
    h1: () => insertBlock('# '),
    h2: () => insertBlock('## '),
    h3: () => insertBlock('### '),
    h4: () => insertBlock('#### '),
    h5: () => insertBlock('##### '),
    bold: () => insertText('**', '**'),
    italic: () => insertText('*', '*'),
    strike: () => insertText('~~', '~~'),
    code: () => insertText('`', '`'),
    codeBlock: () => insertText('```\n', '\n```'),
    quote: () => insertBlock('> '),
    bulletList: () => insertBlock('- '),
    orderedList: () => insertBlock('1. '),
    checklist: () => insertBlock('- [ ] '),
    horizontalRule: () => insertBlock('---'),
    
    table: (rows, cols) => {
      let markdown = '\n';
      // 表头
      markdown += '| ' + Array(cols).fill('标题').join(' | ') + ' |\n';
      // 分隔线
      markdown += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
      // 数据行
      for (let r = 0; r < rows; r++) {
         markdown += '| ' + Array(cols).fill('内容').join(' | ') + ' |\n';
      }
      markdown += '\n';
      insertText(markdown);
    },

    link: (url) => insertText('[', `](${url})`),
    image: (url) => insertBlock(`![Image](${url})`),
    video: (url) => insertBlock(`\n::video{src="${url}" width="100%"}\n`),
    audio: (url) => insertBlock(`\n::audio{src="${url}" width="100%"}\n`),
  };

  // 工具定义
  const tools = {
    // ... 基础工具定义
    heading: { 
      icon: Heading, 
      title: '标题', 
      type: 'dropdown',
      options: [
        { label: '二级标题', value: 'h2', icon: Heading2 },
        { label: '三级标题', value: 'h3', icon: Heading3 },
        { label: '四级标题', value: 'h4', icon: Heading4 },
        { label: '五级标题', value: 'h5', icon: Heading5 },
      ]
    },
    bold: { icon: Bold, title: '加粗', type: 'button' },
    italic: { icon: Italic, title: '斜体', type: 'button' },
    strike: { icon: Strikethrough, title: '删除线', type: 'button' },
    code: { icon: Code, title: '行内代码', type: 'button' },
    codeBlock: { icon: FileCode, title: '代码块', type: 'button' },
    quote: { icon: Quote, title: '引用', type: 'button' },
    bulletList: { icon: List, title: '无序列表', type: 'button' },
    orderedList: { icon: ListOrdered, title: '有序列表', type: 'button' },
    checklist: { icon: ListTodo, title: '任务列表', type: 'button' },
    horizontalRule: { icon: Minus, title: '分割线', type: 'button' },
    table: { icon: TableIcon, title: '表格', type: 'table-selector' },
    link: { icon: LinkIcon, title: '链接', type: 'popover', placeholder: '输入链接地址...' },
    image: { icon: ImageIcon, title: '图片', type: 'popover', placeholder: '输入图片地址...' },
    video: { icon: VideoIcon, title: '视频', type: 'popover', placeholder: '支持 Bilibili/YouTube/MP4' },
    audio: { icon: MusicIcon, title: '音频', type: 'popover', placeholder: '支持网易云音乐 / MP3 URL...' },
  };

  const showToolbar = isExpanded || !minimal;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* 工具栏 - 仅在展开模式或非极简模式下显示 */}
      {showToolbar && (
        <div className="flex items-center justify-between p-2 border border-b-0 rounded-tl-lg rounded-tr-lg bg-muted/30">
          <div className="flex items-center gap-1 flex-wrap">
            {toolbar.map((item, index) => {
              if (item === '|') {
                return <div key={index} className="w-px h-6 bg-border mx-1" />;
              }

              const tool = tools[item];
              if (!tool) return null;

              if (tool.type === 'table-selector') {
                return (
                  <TableSelector 
                    key={item}
                    title={tool.title}
                    Icon={tool.icon}
                    onConfirm={handlers[item]}
                    disabled={isPreviewMode || disabled}
                  />
                );
              }

              if (tool.type === 'dropdown') {
                return (
                  <DropdownMenu key={item}>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1 px-2"
                        disabled={isPreviewMode || disabled}
                        title={tool.title}
                      >
                        <tool.icon className="h-4 w-4" />
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
                      {tool.options.map((option) => (
                        <DropdownMenuItem 
                          key={option.value}
                          onClick={() => handlers[option.value]()}
                          className="gap-2"
                        >
                          {option.icon && <option.icon className="h-4 w-4" />}
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              if (tool.type === 'popover') {
                return (
                  <InsertForm 
                    key={item}
                    title={tool.title}
                    Icon={tool.icon}
                    placeholder={tool.placeholder}
                    onConfirm={handlers[item]}
                    disabled={isPreviewMode || disabled}
                  />
                );
              }

              return (
                <Button
                  key={item}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlers[item]}
                  disabled={isPreviewMode || disabled}
                  title={tool.title}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
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
        {/* 触发展开的按钮 (极简模式且未展开时显示) */}
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
