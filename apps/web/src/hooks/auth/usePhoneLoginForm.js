'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';

export function usePhoneLoginForm({ onSuccess } = {}) {
  const { loginByPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const validatePhone = useCallback((value) => {
    return /^1[3-9]\d{9}$/.test(value);
  }, []);

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    setError('');

    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    if (!validatePhone(phone.trim())) {
      setError('请输入有效的手机号');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.sendCode(phone.trim(), 'phone_login');
      setCountdown(60);
      toast.success('验证码已发送');
    } catch (err) {
      setError(err.message || '发送验证码失败');
    } finally {
      setIsLoading(false);
    }
  }, [phone, validatePhone]);

  // 验证码登录
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setError('');

    if (!phone.trim() || !code.trim()) {
      setError('请填写手机号和验证码');
      return;
    }

    if (!validatePhone(phone.trim())) {
      setError('请输入有效的手机号');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginByPhone(phone.trim(), code.trim());

      if (result.success) {
        if (result.needSetPassword) {
          toast.success('登录成功！建议前往设置页面设置登录密码');
        } else {
          toast.success('登录成功！');
        }
        resetForm();
        onSuccess?.();
      } else {
        setError(result.error || '登录失败');
        toast.error(result.error || '登录失败');
      }
    } catch (err) {
      const errorMsg = err.message || '登录失败';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [phone, code, loginByPhone, onSuccess, validatePhone]);

  const resetForm = useCallback(() => {
    setPhone('');
    setCode('');
    setError('');
    setCountdown(0);
  }, []);

  return {
    phone,
    setPhone,
    code,
    setCode,
    countdown,
    isLoading,
    error,
    setError,
    handleSendCode,
    handleSubmit,
    resetForm,
  };
}
