'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

// 多个 CDN 源，竞速加载
const CDN_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.40.0/dist/browser/standalone.min.js',
  'https://unpkg.com/@scalar/api-reference@1.40.0/dist/browser/standalone.js'
];

// 加载单个脚本，返回 Promise
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.body.appendChild(script);
  });
};

// 竞速加载：并行请求所有 CDN，使用最先成功的
const loadScriptWithRace = async () => {
  // 使用 Promise.any - 任意一个成功即可
  try {
    const script = await Promise.any(CDN_SOURCES.map(loadScript));
    return script;
  } catch {
    throw new Error('All CDN sources failed to load');
  }
};

// 加载状态组件
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative">
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150" />
        {/* 图标容器 */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/20">
          <FileText className="w-10 h-10 text-primary" />
        </div>
      </div>
      {/* 加载动画和文字 */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Spinner className="w-5 h-5 text-primary" />
          <span className="text-lg font-medium text-foreground">加载 API 文档</span>
        </div>
        <p className="text-sm text-muted-foreground">正在从 CDN 获取资源...</p>
      </div>
      {/* 进度条动画 */}
      <div className="mt-6 w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

// 错误状态组件
function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="relative">
        {/* 背景光晕 */}
        <div className="absolute inset-0 bg-destructive/10 rounded-full blur-3xl scale-150" />
        {/* 图标容器 */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-linear-to-br from-destructive/20 to-destructive/5 border border-destructive/20">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
      </div>
      {/* 错误信息 */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <h3 className="text-lg font-semibold text-foreground">加载失败</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          无法加载 API 文档资源，请检查网络连接后重试
        </p>
        <p className="text-xs text-muted-foreground/60 font-mono mt-1">{error}</p>
      </div>
      {/* 重试按钮 */}
      <Button onClick={onRetry} variant="outline" className="mt-6 gap-2">
        <RefreshCw className="w-4 h-4" />
        重新加载
      </Button>
    </div>
  );
}

export default function ScalarAPI({ config }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scriptRef = useRef(null);

  const loadAPI = () => {
    setLoading(true);
    setError(null);

    loadScriptWithRace()
      .then((script) => {
        scriptRef.current = script;
        if (window.Scalar) {
          setLoading(false);
          window.Scalar.createApiReference('#ScalarAPP', config);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAPI();

    return () => {
      // 清理所有加载的脚本
      document.querySelectorAll('script[src*="scalar"]').forEach((s) => s.remove());
    };
  }, []);

  if (error) {
    return <ErrorState error={error} onRetry={loadAPI} />;
  }

  return (
    <>
      {loading && <LoadingState />}
      <div id="ScalarAPP" />
    </>
  );
}
