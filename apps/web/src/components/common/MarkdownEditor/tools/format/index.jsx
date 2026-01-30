import React from 'react';
import { 
  Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, 
  ListTodo, Minus, FileCode, Heading, Heading2, Heading3, Heading4, Heading5, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 基础格式化工具定义
const FORMAT_TOOLS = {
  bold: { icon: Bold, title: '加粗', before: '**', after: '**' },
  italic: { icon: Italic, title: '斜体', before: '*', after: '*' },
  strike: { icon: Strikethrough, title: '删除线', before: '~~', after: '~~' },
  code: { icon: Code, title: '行内代码', before: '`', after: '`' },
  codeBlock: { icon: FileCode, title: '代码块', before: '```\n', after: '\n```' },
  quote: { icon: Quote, title: '引用', blockPrefix: '> ' },
  bulletList: { icon: List, title: '无序列表', blockPrefix: '- ' },
  orderedList: { icon: ListOrdered, title: '有序列表', blockPrefix: '1. ' },
  checklist: { icon: ListTodo, title: '任务列表', blockPrefix: '- [ ] ' },
  horizontalRule: { icon: Minus, title: '分割线', blockPrefix: '---' },
};

export const FormatTool = ({ type, editor, disabled }) => {
  const config = FORMAT_TOOLS[type];
  if (!config) return null;

  const handleClick = () => {
    if (config.blockPrefix) {
      editor.insertBlock(config.blockPrefix);
    } else {
      editor.insertText(config.before, config.after);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={handleClick}
      disabled={disabled}
      title={config.title}
    >
      <config.icon className="h-4 w-4" />
    </Button>
  );
};

export const HeadingTool = ({ editor, disabled }) => {
  const options = [
    { label: '二级标题', value: '## ', icon: Heading2 },
    { label: '三级标题', value: '### ', icon: Heading3 },
    { label: '四级标题', value: '#### ', icon: Heading4 },
    { label: '五级标题', value: '##### ', icon: Heading5 },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-1 px-2"
          disabled={disabled}
          title="标题"
        >
          <Heading className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
        {options.map((option) => (
          <DropdownMenuItem 
            key={option.value}
            onClick={() => editor.insertBlock(option.value)}
            className="gap-2"
          >
            <option.icon className="h-4 w-4" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
