'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FormDialog } from '@/components/common/FormDialog';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi, invitationsApi, oauthConfigApi } from '@/lib/api';
import { toast } from 'sonner';

// 导入子组件
import { QRLoginTab } from './QRLoginTab';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { OAuthSection } from './OAuthSection';
import { ModeSwitcher } from './ModeSwitcher';

export default function LoginDialog({ open, onOpenChange }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot-password'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password', 'qr'
  const [oauthProviders, setOauthProviders] = useState([]);
  const [qrLoginEnabled, setQrLoginEnabled] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '', // 用于登录的用户名或邮箱
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    invitationCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationMode, setRegistrationMode] = useState('open');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [invitationCodeStatus, setInvitationCodeStatus] = useState(null);

  const isLogin = mode === 'login';
  const isForgotPassword = mode === 'forgot-password';

  // 获取注册模式设置和 OAuth 提供商
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [settings, oauthData] = await Promise.all([
          settingsApi.getAll(),
          oauthConfigApi.getProviders().catch(() => ({ items: [] })),
        ]);

        if (settings.registration_mode) {
          setRegistrationMode(settings.registration_mode.value);
        }

        if (settings.qr_login_enabled) {
          setQrLoginEnabled(settings.qr_login_enabled.value === true);
        }

        if (oauthData.items) {
          setOauthProviders(oauthData.items);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // 默认开放注册
        setRegistrationMode('open');
      } finally {
        setLoadingSettings(false);
      }
    };

    if (open) {
      fetchSettings();
    }
  }, [open]);

  // 验证邀请码
  const validateInvitationCode = async () => {
    if (!formData.invitationCode.trim()) {
      setInvitationCodeStatus(null);
      return;
    }

    try {
      const result = await invitationsApi.validate(formData.invitationCode.trim());
      setInvitationCodeStatus(result);
    } catch (error) {
      setInvitationCodeStatus({
        valid: false,
        message: '验证失败，请稍后重试',
      });
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 验证
    if (isLogin) {
      if (!formData.identifier || !formData.password) {
        setError('请填写用户名/邮箱和密码');
        return;
      }
    } else {
      // 检查注册模式
      if (registrationMode === 'closed') {
        setError('系统当前已关闭用户注册');
        toast.error('系统当前已关闭用户注册');
        return;
      }

      // 如果是邀请码模式，检查邀请码
      if (registrationMode === 'invitation' && !formData.invitationCode) {
        setError('邀请码注册模式下必须提供邀请码');
        toast.error('邀请码注册模式下必须提供邀请码');
        return;
      }

      if (!formData.username || !formData.email || !formData.password) {
        setError('请填写所有必填字段');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (formData.password.length < 6) {
        setError('密码长度至少为6位');
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        // 登录（使用用户名或邮箱）
        result = await login(formData.identifier, formData.password);
      } else {
        // 注册
        const registerData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name || formData.username
        };

        // 如果是邀请码模式，添加邀请码
        if (registrationMode === 'invitation') {
          registerData.invitationCode = formData.invitationCode;
        }

        result = await register(registerData);
      }

      if (result.success) {
        toast.success(isLogin ? '登录成功！' : '注册成功！欢迎加入！');
        handleOpenChange(false);
        // 重置表单
        setFormData({
          identifier: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          name: '',
          invitationCode: ''
        });
        setInvitationCodeStatus(null);
      } else {
        setError(result.error || (isLogin ? '登录失败' : '注册失败'));
        toast.error(result.error || (isLogin ? '登录失败' : '注册失败'));
      }
    } catch (err) {
      const errorMsg = err.message || (isLogin ? '登录失败' : '注册失败');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // 检查注册表单是否有内容
  const hasRegisterFormContent = () => {
    if (mode !== 'register') return false;
    return !!(
      formData.username ||
      formData.email ||
      formData.password ||
      formData.confirmPassword ||
      formData.name ||
      formData.invitationCode
    );
  };

  const handleOpenChange = (isOpen) => {
    // 当对话框关闭时，重置表单
    if (!isOpen) {
      setMode('login');
      setLoginMethod('password');
      setFormData({
        identifier: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        invitationCode: ''
      });
      setError('');
      setSuccess('');
      setInvitationCodeStatus(null);
    }
    onOpenChange?.(isOpen);
  };

  // 处理点击遮罩的事件
  const handleInteractOutside = (e) => {
    // 如果注册表单有内容，阻止关闭
    if (hasRegisterFormContent()) {
      e.preventDefault();
      // toast.info('表单中有未保存的内容，请先完成注册或清空表单');
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    if (newMode !== 'register') {
      setInvitationCodeStatus(null);
    }
  };

  const handleForgotPasswordClick = () => {
    setMode('forgot-password');
    setError('');
    setSuccess('');
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      onInteractOutside={handleInteractOutside}
      title={isForgotPassword ? '找回密码' : isLogin ? '登录' : '注册'}
      description={
        isForgotPassword
          ? '输入您的邮箱地址，我们将发送密码重置验证码'
          : isLogin
          ? '登录到您的账户以继续'
          : '创建新账户以加入社区'
      }
      maxWidth="sm:max-w-[450px]"
      footer={null}
    >
        {/* 登录时显示密码/扫码选项卡 */}
        {isLogin && qrLoginEnabled ? (
          <Tabs value={loginMethod} onValueChange={setLoginMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">密码登录</TabsTrigger>
              <TabsTrigger value="qr">扫码登录</TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="mt-4">
              <LoginForm
                formData={formData}
                error={error}
                isLoading={isLoading}
                onSubmit={handleSubmit}
                onChange={handleChange}
                onForgotPassword={handleForgotPasswordClick}
              />

              <OAuthSection
                providers={oauthProviders}
                isLogin={true}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                setError={setError}
              />
            </TabsContent>

            <TabsContent value="qr" className="mt-4">
              <QRLoginTab onSuccess={() => handleOpenChange(false)} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* 找回密码表单 */}
            {isForgotPassword && (
              <ForgotPasswordForm
                onSuccess={() => {
                  setMode('login');
                  toast.success('密码重置成功，请使用新密码登录');
                }}
              />
            )}

            {/* 登录表单 */}
            {isLogin && !isForgotPassword && (
              <>
                <LoginForm
                  formData={formData}
                  error={error}
                  isLoading={isLoading}
                  onSubmit={handleSubmit}
                  onChange={handleChange}
                  onForgotPassword={handleForgotPasswordClick}
                />

                <OAuthSection
                  providers={oauthProviders}
                  isLogin={true}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  setError={setError}
                />
              </>
            )}

            {/* 注册表单 */}
            {!isLogin && !isForgotPassword && (
              <>
                <RegisterForm
                  formData={formData}
                  error={error}
                  isLoading={isLoading}
                  registrationMode={registrationMode}
                  invitationCodeStatus={invitationCodeStatus}
                  onSubmit={handleSubmit}
                  onChange={handleChange}
                  onInvitationCodeBlur={validateInvitationCode}
                />

                <OAuthSection
                  providers={oauthProviders}
                  isLogin={false}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  setError={setError}
                />
              </>
            )}
          </>
        )}

        {/* 模式切换 */}
        <ModeSwitcher
          mode={mode}
          registrationMode={registrationMode}
          isLoading={isLoading}
          loadingSettings={loadingSettings}
          onModeChange={handleModeChange}
        />
    </FormDialog>
  );
}
