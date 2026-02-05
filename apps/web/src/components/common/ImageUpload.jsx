import { useState, useRef, useMemo } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { uploadApi } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import { MAX_UPLOAD_SIZE_ADMIN_KB, MAX_UPLOAD_SIZE_DEFAULT_KB, DEFAULT_ALLOWED_EXTENSIONS, EXT_MIME_MAP } from '@/constants/upload';

/**
 * 通用图片上传组件
 * @param {Object} props
 * @param {string} props.value - 当前图片 URL
 * @param {Function} props.onChange - 图片上传成功后的回调 (url) => void
 * @param {'avatars' | 'badges' | 'topics' | 'items' | 'frames' | 'emojis' | 'assets'} props.category - 上传分类
 * @param {string} props.className - 容器类名
 * @param {string} props.placeholder - 占位文本
 */
export function ImageUpload({
  value,
  onChange,
  category = 'assets',
  className,
  placeholder = "点击或拖拽上传图片"
}) {
  const { getPermissionConditions, isAdmin } = usePermission();
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  // 动态获取上传配额
  const uploadConditions = useMemo(() => getPermissionConditions(`upload.${category}`), [getPermissionConditions, category]);
  
  // 核心逻辑：管理员拥有全局最高上限 (100MB)，普通用户根据 RBAC 条件决定 (默认 5MB)
  const maxFileSizeKB = useMemo(() => {
    if (isAdmin) return MAX_UPLOAD_SIZE_ADMIN_KB; // 管理员默认 100MB (与后端插件设置一致)
    return uploadConditions?.maxFileSize || MAX_UPLOAD_SIZE_DEFAULT_KB; // 普通用户默认 5MB
  }, [isAdmin, uploadConditions]);

  const maxSizeBytes = maxFileSizeKB * 1024;
  const maxFileSizeDisplay = maxFileSizeKB >= 1024 
    ? (maxFileSizeKB / 1024).toFixed(0) + 'MB' 
    : maxFileSizeKB + 'KB';



  // 计算允许的文件扩展名
  // ['*'] 表示无限制（管理员），使用所有已知扩展名
  const allowedExts = useMemo(() => {
    const types = uploadConditions?.allowedFileTypes;
    if (types?.includes('*')) {
      return Object.keys(EXT_MIME_MAP);
    }
    return types || DEFAULT_ALLOWED_EXTENSIONS;
  }, [uploadConditions]);

  // 动态生成 accept 属性 (UX 优化：让文件选择框默认只显示允许的类型)
  // 同时包含后缀和对应的 MIME 类型，提升各平台浏览器识别率
  const acceptAttribute = useMemo(() => {
    const types = uploadConditions?.allowedFileTypes;
    // ['*'] 表示无限制，使用通用图片类型
    if (types?.includes('*')) {
      return "image/*";
    }
    if (types?.length > 0) {
      const combined = [
        ...types.map(ext => `.${ext}`),
        ...types.map(ext => EXT_MIME_MAP[ext] || []).flat()
      ];
      return [...new Set(combined)].join(',');
    }
    return "image/*"; // Default fallback
  }, [uploadConditions]);

  const handleFile = async (file) => {
    if (!file) return;

    // 验证文件扩展名
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExts.includes(ext)) {
      toast.error(`不支持的文件类型，允许：${allowedExts.join(', ')}`);
      return;
    }

    // MIME 类型一致性预检 (校验 file.type 是否符合映射关系)
    const expectedMimes = EXT_MIME_MAP[ext];
    if (expectedMimes && !expectedMimes.includes(file.type)) {
      toast.error('文件内容与后缀不匹配，请上传真实的图片文件');
      return;
    }

    // 动态配额预验证 (前端友好提示)
    if (file.size > maxSizeBytes) {
      toast.error(`图片大小不能超过 ${maxFileSizeDisplay}`);
      return;
    }

    try {
      setLoading(true);
      const res = await uploadApi.upload(file, category);
      onChange(`${res.url}`);
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
        accept={acceptAttribute}
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
                支持 {allowedExts.map(ext => ext.toUpperCase()).join(', ')} (最大 {maxFileSizeDisplay})
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
