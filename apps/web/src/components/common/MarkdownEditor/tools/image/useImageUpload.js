import { useCallback, useMemo, useRef } from 'react';
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
  const { hasPermission, isAdmin } = usePermission();

  // 替换操作队列，确保并发上传时替换操作按顺序执行，避免状态覆盖
  const replaceQueue = useRef(Promise.resolve());

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

    // 检查对应上传场景的权限
    if (!hasPermission(`upload.${uploadType}`)) return undefined;

    return defaultUploadHandler;
  }, [onUpload, isAdmin, hasPermission, uploadType]);

  // 辅助函数：安全替换文本
  const safeReplace = useCallback((target, replacement) => {
    // 将替换操作加入队列
    replaceQueue.current = replaceQueue.current.then(() => {
      return new Promise((resolve) => {
        const textarea = textareaRef.current;
        if (!textarea) {
          resolve();
          return;
        }

        const currentVal = textarea.value;
        // 只有当目标文本存在时才替换
        if (currentVal.includes(target)) {
          const newVal = currentVal.replace(target, replacement);
          
          // 立即更新 DOM 值，确保后续队列任务能读取到最新值
          // 解决 React 状态更新异步导致的值覆盖问题
          textarea.value = newVal;
          
          onChange?.(newVal);
          
          // 既然已经手动更新 DOM，不需要等待 React 渲染
          resolve();
        } else {
          // 目标文本可能已经被替换或不存在
          resolve();
        }
      });
    });
  }, [onChange, textareaRef]);

  // 2. 核心上传执行逻辑
  const executeUpload = useCallback(async (filesInput) => {
    if (!handleUpload) return;

    // 统一转为数组处理
    let files = [];
    if (filesInput instanceof FileList) {
        files = Array.from(filesInput);
    } else if (Array.isArray(filesInput)) {
        files = filesInput;
    } else if (filesInput instanceof File) {
        files = [filesInput];
    } else {
        // Fallback for cases where it might be a single file but not explicitly instanceof File (e.g. some mocks)
        files = [filesInput];
    }
    
    const imageFiles = files.filter(f => f?.type?.startsWith('image/'));

    if (imageFiles.length === 0) {
      if (files.length > 0) toast.error('只能上传图片文件');
      return;
    }

    // 第一步：批量生成占位符并一次性插入
    // 这样避免了多次 insertBlock 导致的 DOM 读取竞态问题
    const uploads = imageFiles.map(file => {
      const uploadId = Math.random().toString(36).slice(2, 8);
      const placeholderText = `![上传中 ${file.name}...](loading-${uploadId})`;
      return { file, placeholderText };
    });

    const allPlaceholders = uploads.map(u => u.placeholderText).join('\n');
    insertBlock(allPlaceholders);

    // 第二步：并发上传 (最大并发数 5)
    // 采用滑动窗口模式：完成一个补一个，而不是等待整批结束
    const MAX_CONCURRENCY = 5;
    const queue = [...uploads];
    const activeWorkers = Math.min(queue.length, MAX_CONCURRENCY);

    const worker = async () => {
      while (queue.length > 0) {
        const task = queue.shift();
        if (!task) break;

        const { file, placeholderText } = task;
        try {
          const url = await handleUpload(file);
          // 使用队列安全替换
          safeReplace(placeholderText, `![${file.name}](${url})`);
        } catch (error) {
          console.error('Upload failed:', error);
          safeReplace(placeholderText, ''); // 失败则移除占位符
          toast.error(error.message || `图片 ${file.name} 上传失败`);
        }
      }
    };

    // 启动 Worker 池
    await Promise.all(Array.from({ length: activeWorkers }).map(worker));

  }, [handleUpload, insertBlock, safeReplace]);

  // 3. 事件拦截器
  const handlePaste = useCallback((e) => {
    if (!handleUpload) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
        e.preventDefault();
        executeUpload(imageFiles);
    }
  }, [handleUpload, executeUpload]);

  const handleDrop = useCallback((e) => {
    if (!handleUpload) return;
    const files = e.dataTransfer?.files;
    
    if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
            e.preventDefault();
            executeUpload(imageFiles);
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
