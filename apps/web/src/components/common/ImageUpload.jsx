import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadApi } from '@/lib/api';
import { getApiHost } from '@/lib/api-url';

/**
 * 通用图片上传组件
 * @param {Object} props
 * @param {string} props.value - 当前图片 URL
 * @param {Function} props.onChange - 图片上传成功后的回调 (url) => void
 * @param {'common' | 'avatar' | 'badge' | 'topic' | 'item' | 'frame'} props.type - 上传类型
 * @param {string} props.className - 容器类名
 * @param {string} props.placeholder - 占位文本
 */
export function ImageUpload({ 
  value, 
  onChange, 
  type = 'common', 
  className,
  placeholder = "点击或拖拽上传图片" 
}) {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    // 基本验证
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
      const apiHost = getApiHost();
      onChange(`${apiHost}${res.url}`);
      toast.success('上传成功');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || '上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
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
    <div className={cn("space-y-4", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      {!value ? (
        <div
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer hover:bg-muted/50",
            dragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25",
            loading && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !loading && inputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">{placeholder}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 JPG, PNG, GIF, WebP (最大 5MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative w-full h-48 rounded-lg border overflow-hidden group">
          <img
            src={value}
            alt="Uploaded image"
            className="w-full h-full object-contain bg-muted/20"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => !loading && inputRef.current?.click()}
              className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
              title="更换图片"
              type="button"
            >
              <Upload className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={handleRemove}
              className="p-2 bg-white rounded-full hover:bg-red-50 transition-colors"
              title="删除图片"
              type="button"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
          {loading && (
             <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
             </div>
          )}
        </div>
      )}
    </div>
  );
}
