import React, { useState } from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { UploadButton } from './UploadButton';
import { useImageUpload } from './useImageUpload';

export const ImageTool = ({ editor, disabled, config }) => {
  const { onUpload, uploadType, textareaRef, onChange } = config;
  const [url, setUrl] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // 使用 useImageUpload 钩子处理上传逻辑
  const { isEnabled: isUploadEnabled, executeUpload } = useImageUpload({
    onUpload,
    uploadType,
    insertBlock: editor.insertBlock,
    onChange,
    textareaRef
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (url.trim()) {
      editor.insertBlock(`![Image](${url})`);
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
          title="图片"
          disabled={disabled}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <h4 className="font-medium leading-none text-sm mb-1">插入图片</h4>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="输入图片地址..."
              className="h-8 text-sm"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-8 px-2">
              <Check className="h-4 w-4" />
            </Button>
          </div>
          
          {isUploadEnabled && (
            <UploadButton 
              onUpload={executeUpload} 
              onClosePopover={() => setIsOpen(false)} 
            />
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
};
