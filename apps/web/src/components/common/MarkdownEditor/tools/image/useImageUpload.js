import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { uploadApi } from '@/lib/api';

/**
 * 图片上传逻辑 Hook
 * 封装权限检查、API调用、事件拦截
 */
export function useImageUpload({ 
  onUpload, 
  uploadType = 'topics', 
  insertBlock,
  onChange,
  textareaRef 
}) {
  const { getPermissionConditions, hasPermission, isAdmin } = usePermission();

  // 1. 决定最终的上传处理函数 (权限检查)
  const handleUpload = useMemo(() => {
    // 外部覆盖优先
    if (onUpload) return onUpload;

    // 默认上传逻辑
    const defaultUploadHandler = async (file) => {
      const res = await uploadApi.upload(file, uploadType);
      return res.url;
    };

    // 管理员允许一切
    if (isAdmin) {
      return defaultUploadHandler;
    }

    // 检查基础权限
    if (!hasPermission('upload.create')) return undefined;

    // 检查条件限制
    const conditions = getPermissionConditions('upload.create');
    // 无条件限制或无 uploadTypes 限制 -> 允许
    if (!conditions || !conditions.uploadTypes) {
      return defaultUploadHandler;
    }

    // 检查特定类型限制
    if (conditions.uploadTypes.includes(uploadType)) {
      return defaultUploadHandler;
    }

    return undefined;
  }, [onUpload, isAdmin, hasPermission, getPermissionConditions, uploadType]);

  // 2. 核心上传执行逻辑
  const executeUpload = useCallback(async (file) => {
    if (!handleUpload) return;
    if (!file.type.startsWith('image/')) {
      toast.error('只能上传图片文件');
      return;
    }

    // 插入占位符
    const uploadId = Math.random().toString(36).slice(2, 8);
    const placeholderText = `![上传中 ${file.name}...](loading-${uploadId})`;
    insertBlock(placeholderText);

    try {
      const url = await handleUpload(file);
      
      // 替换占位符
      const textarea = textareaRef.current;
      if (textarea) {
        const text = textarea.value;
        const newText = text.replace(placeholderText, `![${file.name}](${url})`);
        onChange?.(newText);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const textarea = textareaRef.current;
      if (textarea) {
        const text = textarea.value;
        // 移除占位符
        const newText = text.replace(placeholderText, '');
        onChange?.(newText);
      }
      toast.error(error.message || '图片上传失败');
    }
  }, [handleUpload, insertBlock, onChange, textareaRef]);

  // 3. 事件拦截器
  const handlePaste = useCallback((e) => {
    if (!handleUpload) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        executeUpload(file);
        return; 
      }
    }
  }, [handleUpload, executeUpload]);

  const handleDrop = useCallback((e) => {
    if (!handleUpload) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            e.preventDefault();
            executeUpload(file);
        }
    }
  }, [handleUpload, executeUpload]);

  return {
    isEnabled: !!handleUpload,
    executeUpload,
    handlePaste,
    handleDrop
  };
}
