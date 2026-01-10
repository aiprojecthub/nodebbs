'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadApi } from '@/lib/api';

/**
 * 紧凑型图标上传组件（用于站点 Logo、Favicon 等小图标）
 * @param {Object} props
 * @param {string} props.value - 当前图片 URL
 * @param {Function} props.onChange - 图片上传成功后的回调 (url) => void
 * @param {string} props.type - 上传类型，默认 'site'
 * @param {string} props.accept - 接受的文件类型
 * @param {string} props.placeholder - 占位图标路径（默认兜底）
 * @param {string} props.hint - 提示文本
 * @param {string} props.className - 容器类名
 */
export function IconUpload({ 
  value, 
  onChange, 
  type = 'site', 
  accept = 'image/*',
  placeholder,
  hint = '点击上传',
  className 
}) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // 显示的图片：优先使用 value，为空时使用 placeholder 兜底
  const displayUrl = value || placeholder;

  const handleFile = async (file) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    try {
      setLoading(true);
      const res = await uploadApi.upload(file, type);
      onChange(res.url);
      toast.success('上传成功');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || '上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      
      {/* 图标预览区域 */}
      <div
        className={cn(
          "relative flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed transition-colors cursor-pointer hover:border-primary hover:bg-muted/50 overflow-hidden",
          loading && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !loading && inputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt="icon"
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <Upload className="w-6 h-6 text-muted-foreground" />
        )}
      </div>

      {/* 操作按钮和提示 */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !loading && inputRef.current?.click()}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {value ? '更换' : '上传'}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-destructive hover:underline"
              disabled={loading}
            >
              移除
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
