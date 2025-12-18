'use client';

import React, { useState, useRef, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  'link', 'image', 'table'
  // 'link', 'image', 'video', 'audio', 'table'
];

/**
 * MarkdownEditor - 可配置的 Markdown 编辑器
 */
export default function MarkdownEditor({ 
  value = '', 
  onChange, 
  className, 
  placeholder = '开始编辑...',
  toolbar = DEFAULT_TOOLBAR 
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const textareaRef = useRef(null);

  // 文本操作辅助函数
  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop; // Save scroll position
    const text = textarea.value;
    const selection = text.substring(start, end);
    const replacement = before + selection + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    onChange?.(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
      textarea.scrollTop = scrollTop; // Restore scroll position
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
  const handlers = useMemo(() => ({
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
      // Header row
      markdown += '| ' + Array(cols).fill('标题').join(' | ') + ' |\n';
      // Separator row
      markdown += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
      // Data rows
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
  }), []);

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
    audio: { icon: MusicIcon, title: '音频', type: 'popover', placeholder: '输入音频地址 (MP3)...' },
  };

  return (
    <div className={cn('border rounded-lg flex flex-col', className)}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
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
                  disabled={isPreviewMode}
                />
              );
            }

            if (tool.type === 'dropdown') {
              // ... 渲染下拉菜单
              return (
                <DropdownMenu key={item}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1 px-2"
                      disabled={isPreviewMode}
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
               // ... 渲染弹窗
              return (
                <InsertForm 
                  key={item}
                  title={tool.title}
                  Icon={tool.icon}
                  placeholder={tool.placeholder}
                  onConfirm={handlers[item]}
                  disabled={isPreviewMode}
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
                disabled={isPreviewMode}
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

      {/* 内容区域 */}
      <div className="flex-1 min-h-[300px] relative bg-background">
        {isPreviewMode ? (
          <div className="p-4 prose prose-sm dark:prose-invert max-w-none h-full overflow-y-auto">
            <MarkdownRender content={value || ''} />
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            className='min-h-[300px] max-h-[calc(100vh-280px)] resize-none overflow-y-auto field-sizing-fixed rounded-tl-none rounded-tr-none sm:field-sizing-content bg-card wrap-break-word break-all'
          />
        )}
      </div>
    </div>
  );
}
