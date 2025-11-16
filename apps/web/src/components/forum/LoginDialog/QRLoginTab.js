'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export function QRLoginTab({ onSuccess }) {
  const { setAuthData } = useAuth();
  const [qrData, setQrData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, pending, confirmed, expired, error
  const [countdown, setCountdown] = useState(0);
  const pollingRef = useRef(null);

  // 生成二维码
  const generateQRCode = async () => {
    try {
      setStatus('loading');
      const data = await authApi.generateQRLogin();

      setQrData(data);
      setStatus('pending');

      // 计算倒计时
      const expiresAt = new Date(data.expiresAt);
      const now = new Date();
      setCountdown(Math.floor((expiresAt - now) / 1000));

      // 开始轮询状态
      startPolling(data.requestId);
    } catch (error) {
      console.error('生成二维码失败:', error);
      setStatus('error');
      toast.error(error.message || '生成二维码失败');
    }
  };

  // 轮询登录状态
  const startPolling = (requestId) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const data = await authApi.getQRLoginStatus(requestId);

        if (data.status === 'confirmed' && data.token && data.user) {
          // 登录成功
          setStatus('confirmed');
          clearInterval(pollingRef.current);

          // 保存 token 和用户信息
          setAuthData(data.token, data.user);

          toast.success('扫码登录成功！');

          // 延迟关闭对话框以显示成功状态
          setTimeout(() => {
            onSuccess?.();
          }, 1000);
        } else if (data.status === 'expired') {
          setStatus('expired');
          clearInterval(pollingRef.current);
        }
      } catch (error) {
        console.error('轮询状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
  };

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // 组件加载时生成二维码
  useEffect(() => {
    generateQRCode();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 格式化倒计时
  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <div className="relative">
        {/* 二维码加载中 */}
        {status === 'loading' && (
          <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* 显示二维码 */}
        {status === 'pending' && qrData && (
          <div className="relative">
            <QRCodeSVG
              value={qrData.qrCodeUrl}
              size={256}
              level="H"
              includeMargin
              className="border-4 border-border rounded-lg"
            />
            {/* 倒计时覆盖层 */}
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <span className="bg-background/80 px-2 py-1 rounded text-sm font-medium">
                {formatCountdown(countdown)}
              </span>
            </div>
          </div>
        )}

        {/* 登录成功 */}
        {status === 'confirmed' && (
          <div className="flex flex-col items-center justify-center w-64 h-64 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="w-16 h-16 text-green-600 mb-2" />
            <p className="text-green-700 dark:text-green-400 font-medium">登录成功</p>
          </div>
        )}

        {/* 过期或错误 */}
        {(status === 'expired' || status === 'error') && (
          <div className="flex flex-col items-center justify-center w-64 h-64 bg-muted rounded-lg">
            <XCircle className="w-16 h-16 text-destructive mb-2" />
            <p className="text-muted-foreground font-medium mb-4">
              {status === 'expired' ? '二维码已过期' : '加载失败'}
            </p>
            <Button onClick={generateQRCode} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新二维码
            </Button>
          </div>
        )}
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          请使用手机App扫描二维码登录
        </p>
        {status === 'pending' && countdown > 0 && (
          <p className="text-xs text-muted-foreground">
            二维码将在 {formatCountdown(countdown)} 后失效
          </p>
        )}
      </div>
    </div>
  );
}
