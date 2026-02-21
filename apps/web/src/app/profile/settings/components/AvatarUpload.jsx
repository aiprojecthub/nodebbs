'use client';

import { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_UPLOAD_SIZE_DEFAULT_KB, DEFAULT_ALLOWED_EXTENSIONS, EXT_MIME_MAP } from '@/constants/upload';
import { uploadApi } from '@/lib/api';

/**
 * 头像上传组件
 * @param {Object} props
 * @param {Function} props.onUpload - 上传成功回调: (url) => void
 * @param {boolean} props.uploading - 外部传入的上传状态 (可选)
 * @param {string} props.accept - 允许的文件类型
 * @param {number} props.maxSize - 最大文件大小 (字节)
 */
export function AvatarUpload({ 
  onUpload, 
  uploading: externalUploading,
  // 默认使用全局配置 (5MB)
  maxSize = MAX_UPLOAD_SIZE_DEFAULT_KB * 1024,
  // 默认构建 accept 字符串
  accept
}) {
  const fileInputRef = useRef(null);
  const [internalUploading, setInternalUploading] = useState(false);

  // 如果未传入 accept，则根据 DEFAULT_ALLOWED_EXTENSIONS 动态生成
  const computedAccept = useMemo(() => {
    if (accept) return accept;
    
    // 从扩展名映射到 MIME 类型
    const mimes = new Set();
    DEFAULT_ALLOWED_EXTENSIONS.forEach(ext => {
       const mapped = EXT_MIME_MAP[ext];
       if (mapped) mapped.forEach(m => mimes.add(m));
    });
    return Array.from(mimes).join(',');
  }, [accept]);

  const uploading = externalUploading !== undefined ? externalUploading : internalUploading;

  // 生成友好的扩展名提示文本
  const acceptExtensionsText = useMemo(() => {
     // 如果外部传入了 custom accept string (e.g. "image/*")，则难以反推扩展名，这里简化处理
     // 优先展示常量中的扩展名，或者如果 accept 比较简单则尝试解析
     // 为了简单一致，这里暂时显示 DEFAULT_ALLOWED_EXTENSIONS 中属于图片的类型
     // 或者直接用 uppercase
     const imageExts = DEFAULT_ALLOWED_EXTENSIONS.filter(ext => 
       ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
     );
     return imageExts.map(e => e.toUpperCase()).join('、');
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清空 input，允许重复选择同一文件
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > maxSize) {
      const sizeMB = maxSize / (1024 * 1024);
      toast.error(`图片大小不能超过 ${sizeMB}MB`);
      return;
    }

    setInternalUploading(true);

    try {
      const result = await uploadApi.upload(file, 'avatars');
      onUpload(result.url); // 注意: 通用上传接口返回 { url: ... }
    } catch (err) {
      console.error('上传头像失败:', err);
      toast.error(err.message || '上传头像失败');
    } finally {
      setInternalUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type='file'
        accept={computedAccept}
        onChange={handleFileChange}
        className='hidden'
      />
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleClick}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className='h-4 w-4 animate-spin' />
            上传中...
          </>
        ) : (
          <>
            <Upload className='h-4 w-4' />
            上传新头像
          </>
        )}
      </Button>
      <p className='text-xs text-muted-foreground mt-2'>
        推荐尺寸：200x200px，支持 {acceptExtensionsText} 格式，最大 {maxSize / (1024 * 1024)}MB
      </p>
    </>
  );
}
