'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loading } from '@/components/common/Loading';

/**
 * OAuth 回调页面（动态路由）
 * 支持 GitHub、Google、Apple 等提供商
 */
export default function OAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { updateUser } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const provider = params.provider; // 从 URL 路径获取 provider

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // 验证 provider
      const validProviders = ['github', 'google', 'apple'];
      if (!validProviders.includes(provider)) {
        console.error('Invalid provider:', provider);
        setStatus('error');
        setErrorMessage(`不支持的登录方式: ${provider}`);
        toast.error(`不支持的登录方式: ${provider}`);
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      // 处理错误
      if (error) {
        console.error(`${provider} OAuth error:`, error);
        setStatus('error');
        const errorMsg = getErrorMessage(error, provider);
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      // 没有 code，重定向到首页
      if (!code) {
        console.error('Missing code');
        setStatus('error');
        setErrorMessage('授权失败，缺少授权码');
        setTimeout(() => router.push('/'), 1000);
        return;
      }

      try {
        setStatus('processing');

        // 根据不同的提供商调用对应的回调 API
        let result;
        switch (provider) {
          case 'github':
            result = await authApi.githubCallback(code, state);
            break;
          case 'google':
            result = await authApi.googleCallback(code, state);
            break;
          case 'apple':
            result = await authApi.appleCallback(code, state);
            break;
          default:
            throw new Error(`未知的 OAuth 提供商: ${provider}`);
        }

        if (result.user && result.token) {
          setStatus('success');
          // OAuth 回调已经在 authApi 中设置了 token，这里只需要设置用户状态
          updateUser(result.user);
          toast.success(
            `欢迎回来，${result.user.name || result.user.username}！`
          );

          // 延迟跳转，让用户看到成功提示
          setTimeout(() => router.push('/'), 500);
        } else {
          throw new Error('登录响应格式错误');
        }
      } catch (err) {
        console.error(`${provider} callback error:`, err);
        setStatus('error');

        // 提取友好的错误消息
        let errorMsg = err.message || `${getProviderName(provider)} 登录失败`;

        // 处理特定的错误消息
        if (errorMsg.includes('已关闭用户注册')) {
          errorMsg =
            '系统当前已关闭新用户注册，如果您已有账号，请使用邮箱密码登录';
        } else if (errorMsg.includes('账号已被封禁')) {
          errorMsg = '您的账号已被封禁，如有疑问请联系管理员';
        }

        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setTimeout(() => router.push('/'), 3000); // 延长到3秒，让用户看清错误消息
      }
    };

    if (provider) {
      handleCallback();
    }
  }, []); // 只在组件挂载时执行一次

  return (
    <div className='flex items-center justify-center mt-40'>
      <div className='text-center space-y-4 max-w-md px-4'>
        {status === 'processing' && (
          <Loading text={`正在通过 ${getProviderName(provider)} 登录...`} />
        )}

        {status === 'success' && (
          <>
            <div className='rounded-full h-12 w-12 bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto'>
              <svg
                className='h-6 w-6 text-green-600 dark:text-green-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
            <p className='text-muted-foreground'>登录成功！</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='rounded-full h-12 w-12 bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto'>
              <svg
                className='h-6 w-6 text-red-600 dark:text-red-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </div>
            <p className='text-muted-foreground font-medium'>登录失败</p>
            {errorMessage && (
              <p className='text-sm text-muted-foreground'>{errorMessage}</p>
            )}
            <p className='text-xs text-muted-foreground'>正在返回首页...</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 获取提供商的显示名称
 */
function getProviderName(provider) {
  const names = {
    github: 'GitHub',
    google: 'Google',
    apple: 'Apple',
  };
  return names[provider] || provider;
}

/**
 * 获取友好的错误信息
 */
function getErrorMessage(error, provider) {
  const providerName = getProviderName(provider);

  const errorMessages = {
    access_denied: `您拒绝了 ${providerName} 授权`,
    invalid_request: '授权请求无效',
    unauthorized_client: '应用未授权',
    unsupported_response_type: '不支持的响应类型',
    invalid_scope: '无效的授权范围',
    server_error: `${providerName} 服务器错误`,
    temporarily_unavailable: `${providerName} 服务暂时不可用`,
  };

  return errorMessages[error] || `${providerName} 登录失败: ${error}`;
}
