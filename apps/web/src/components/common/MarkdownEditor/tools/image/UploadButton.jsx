import React, { useState, useRef } from 'react';
import { Loader2, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 上传按钮组件
export const UploadButton = ({ onUpload, onClosePopover }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUpload) {
      try {
        setIsUploading(true);
        // 关闭 Popover
        if (onClosePopover) onClosePopover();
        await onUpload(file);
      } catch (error) {
        console.error('Upload error in toolbar:', error);
      } finally {
        setIsUploading(false);
        // 重置 input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  return (
    <>
      <div className="relative flex items-center py-1">
        <div className="grow border-t border-border"></div>
        <span className="shrink-0 mx-2 text-xs text-muted-foreground">或</span>
        <div className="grow border-t border-border"></div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        className="w-full h-8 text-xs gap-1"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <UploadIcon className="h-3 w-3" />
        )}
        {isUploading ? '上传中...' : '上传本地图片'}
      </Button>
    </>
  );
};
