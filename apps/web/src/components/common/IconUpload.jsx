'use client';

import { useState, useRef, useMemo } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadApi } from '@/lib/api';

import { usePermission } from '@/hooks/usePermission';
import { MAX_UPLOAD_SIZE_ADMIN_KB, MAX_UPLOAD_SIZE_DEFAULT_KB, DEFAULT_ALLOWED_EXTENSIONS, EXT_MIME_MAP } from '@/constants/upload';

/**
 * 紧凑型图标上传组件（用于站点 Logo、Favicon 等小图标）
 * @param {Object} props
 * @param {string} props.value - 当前图片 URL
 * @param {Function} props.onChange - 图片上传成功后的回调 (url) => void
 * @param {string} props.category - 上传分类，默认 'assets'
 * @param {string} props.accept - 接受的文件类型
 * @param {string} props.placeholder - 占位图标路径（默认兜底）
 * @param {string} props.hint - 提示文本
 * @param {string} props.className - 容器类名
 */
export function IconUpload({
  value,
  onChange,
  category = 'assets',
  accept = 'image/*',
  placeholder,
  hint = '点击上传',
  className
}) {
  const { getPermissionConditions, isAdmin } = usePermission();
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // 动态获取上传配额
  const uploadConditions = useMemo(() => getPermissionConditions('upload.create'), [getPermissionConditions]);
  
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
    return accept; // Use prop fallback
  }, [uploadConditions, accept]);

  // 显示的图片：优先使用 value，为空时使用 placeholder 兜底
  const displayUrl = value || placeholder;

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
      toast.error('文件内容与后缀不匹配，请上传正确的图片文件');
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
        accept={acceptAttribute}
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
        <p className="text-xs text-muted-foreground">
          {hint === '点击上传' ? `最大支持 ${maxFileSizeDisplay}` : hint}
        </p>
      </div>
    </div>
  );
}
