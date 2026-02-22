'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// 降级标记 token：当验证服务不可用时，前端发送此值通知后端降级放行
export const CAPTCHA_UNAVAILABLE_TOKEN = '__captcha_unavailable__';
import Script from 'next/script';
import { useCaptchaConfig } from '@/hooks/useCaptcha';

/**
 * Google reCAPTCHA v2 组件
 */
function ReCaptchaV2Widget({ siteKey, onVerify, onExpire, onError, className }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    // 等待 grecaptcha 加载完成
    const renderCaptcha = () => {
      if (window.grecaptcha && containerRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
        });
      }
    };

    // 如果已加载，直接渲染
    if (window.grecaptcha && window.grecaptcha.render) {
      renderCaptcha();
    } else {
      // 监听脚本加载
      window.onRecaptchaLoad = renderCaptcha;
    }

    return () => {
      // 清理
      if (widgetIdRef.current !== null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`}
        strategy="lazyOnload"
        onError={() => onError?.()}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

/**
 * Google reCAPTCHA v3 组件（隐形）
 */
function ReCaptchaV3Widget({ siteKey, action = 'submit', onVerify, className }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => setReady(true));
      }
    };
    
    if (window.grecaptcha) {
      checkReady();
    } else {
      window.onRecaptchaV3Load = checkReady;
    }
  }, []);

  const execute = useCallback(async () => {
    if (!ready || !window.grecaptcha) return null;
    
    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      onVerify?.(token);
      return token;
    } catch (error) {
      console.error('[reCAPTCHA v3] 执行失败:', error);
      return null;
    }
  }, [ready, siteKey, action, onVerify]);

  // 暴露 execute 方法
  useEffect(() => {
    if (ready) {
      // 自动执行一次
      execute();
    }
  }, [ready, execute]);

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${siteKey}&onload=onRecaptchaV3Load`}
        strategy="lazyOnload"
        onError={() => onVerify?.(CAPTCHA_UNAVAILABLE_TOKEN)}
      />
      <div className={className} style={{ display: 'none' }} />
    </>
  );
}

/**
 * hCaptcha 组件
 */
function HCaptchaWidget({ siteKey, onVerify, onExpire, onError, className }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const renderCaptcha = () => {
      if (window.hcaptcha && containerRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
        });
      }
    };

    if (window.hcaptcha && window.hcaptcha.render) {
      renderCaptcha();
    } else {
      window.onHcaptchaLoad = renderCaptcha;
    }

    return () => {
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.reset(widgetIdRef.current);
        } catch (e) {}
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js?onload=onHcaptchaLoad&render=explicit"
        strategy="lazyOnload"
        onError={() => onError?.()}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

/**
 * Cloudflare Turnstile 组件
 */
function TurnstileWidget({ siteKey, onVerify, onExpire, onError, className }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const renderCaptcha = () => {
      if (window.turnstile && containerRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': onError,
        });
      }
    };

    if (window.turnstile && window.turnstile.render) {
      renderCaptcha();
    } else {
      window.onTurnstileLoad = renderCaptcha;
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit"
        strategy="lazyOnload"
        onError={() => onError?.()}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

/**
 * Cap 组件包装器
 * 使用项目已有的 @cap.js/widget 组件
 */
function CapWidgetWrapper({ config, onVerify, onError, className }) {
  // 动态导入以避免 SSR 问题
  const [CapWidget, setCapWidget] = useState(null);

  useEffect(() => {
    import('@/components/wed/cap-widget').then(module => {
      setCapWidget(() => module.CapWidget);
    });
  }, []);

  if (!CapWidget) {
    return null;
  }

  return (
    <CapWidget
      endpoint={config.config?.apiEndpoint}
      onSolve={onVerify}
      onError={onError}
      locale={{
        initial: '我不是机器人',
        verifying: '验证中...',
        solved: '验证成功',
        error: '验证失败',
      }}
      className={className}
    />
  );
}

/**
 * 通用 CAPTCHA 组件
 * 根据后台配置自动渲染对应的验证组件
 * 
 * @param {string} scene - 验证场景：register, login, passwordReset, post, comment
 * @param {function} onVerify - 验证成功回调，返回 token
 * @param {function} onExpire - token 过期回调
 * @param {function} onError - 验证错误回调
 * @param {string} className - 自定义样式类名
 */
export function CaptchaWidget({ 
  scene, 
  onVerify, 
  onExpire, 
  onError, 
  className = '' 
}) {
  const { config, loading, isRequired } = useCaptchaConfig();

  // 验证服务不可用时的降级处理：发送特殊 token 标记
  const handleCaptchaError = useCallback(() => {
    console.warn('[CaptchaWidget] 验证服务异常，发送降级标记');
    onVerify?.(CAPTCHA_UNAVAILABLE_TOKEN);
  }, [onVerify]);

  // 加载中或未配置，不渲染
  if (loading) {
    return null;
  }

  // 未启用或该场景不需要验证
  if (!config?.enabled || !isRequired(scene)) {
    return null;
  }

  const { provider, siteKey, version } = config;

  // 根据 provider 渲染对应组件
  switch (provider) {
    case 'recaptcha':
      // 区分 v2 和 v3
      if (version === 'v3') {
        return (
          <ReCaptchaV3Widget
            siteKey={siteKey}
            action={scene}
            onVerify={onVerify}
            className={className}
          />
        );
      }
      return (
        <ReCaptchaV2Widget
          siteKey={siteKey}
          onVerify={onVerify}
          onExpire={onExpire}
          onError={handleCaptchaError}
          className={className}
        />
      );

    case 'hcaptcha':
      return (
        <HCaptchaWidget
          siteKey={siteKey}
          onVerify={onVerify}
          onExpire={onExpire}
          onError={handleCaptchaError}
          className={className}
        />
      );

    case 'turnstile':
      return (
        <TurnstileWidget
          siteKey={siteKey}
          onVerify={onVerify}
          onExpire={onExpire}
          onError={handleCaptchaError}
          className={className}
        />
      );

    case 'cap':
      return (
        <CapWidgetWrapper
          config={config}
          onVerify={onVerify}
          onError={handleCaptchaError}
          className={className}
        />
      );

    default:
      console.warn(`[CaptchaWidget] 未知的 provider: ${provider}`);
      return null;
  }
}

export default CaptchaWidget;

