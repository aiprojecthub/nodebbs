'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

// 导入拆分的组件
import { ProfileTab } from './components/ProfileTab';
import { PrivacyTab } from './components/PrivacyTab';
import { SecurityTab } from './components/SecurityTab';
import { UsernameChangeDialog } from './components/UsernameChangeDialog';
import { EmailChangeDialog } from './components/EmailChangeDialog';

export default function SettingsPage() {
  const { user, isAuthenticated, loading: authLoading, checkAuth, refreshUser } = useAuth();
  const { settings } = useSettings();

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar: '',
    messagePermission: 'everyone',
    contentVisibility: 'everyone',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 用户名修改相关状态
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameData, setUsernameData] = useState({
    newUsername: '',
    password: '',
  });
  const [changingUsername, setChangingUsername] = useState(false);

  // 邮箱修改相关状态
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1: 验证旧邮箱, 2: 验证新邮箱, 3: 确认提交
  const [emailData, setEmailData] = useState({
    oldEmailCode: '',
    newEmail: '',
    newEmailCode: '',
    password: '',
    oldEmailCodeSent: false,
    newEmailCodeSent: false,
  });
  const [changingEmail, setChangingEmail] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        messagePermission: user.messagePermission || 'everyone',
        contentVisibility: user.contentVisibility || 'everyone',
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      const result = await userApi.uploadAvatar(file);
      setFormData((prev) => ({
        ...prev,
        avatar: result.avatar,
      }));
      toast.success('头像上传成功');
      
      // 局部状态更新完成，立即结束 loading
      setUploadingAvatar(false);
      
      // 后台静默刷新
      refreshUser();
    } catch (err) {
      console.error('上传头像失败:', err);
      toast.error('上传头像失败：' + err.message);
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('姓名不能为空');
      return;
    }

    setLoading(true);

    try {
      await userApi.updateProfile({
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        messagePermission: formData.messagePermission,
        contentVisibility: formData.contentVisibility,
      });

      toast.success('个人资料更新成功');
      
      // 立即结束 loading
      setLoading(false);
      
      // 后台刷新
      refreshUser(); 
    } catch (err) {
      console.error('更新资料失败:', err);
      toast.error('更新失败：' + err.message);
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      toast.error('请填写所有密码字段');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('新密码长度至少为 6 位');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await userApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (res.error) {
        throw new Error(res.error);
      }

      toast.success('密码修改成功');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error('修改密码失败:', err);
      toast.error('修改密码失败：' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // 处理用户名修改
  const handleUsernameSubmit = async () => {
    if (!usernameData.newUsername.trim()) {
      toast.error('请输入新用户名');
      return;
    }

    if (settings.username_change_requires_password?.value && !usernameData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setChangingUsername(true);

    try {
      const result = await userApi.changeUsername(
        usernameData.newUsername,
        usernameData.password
      );

      toast.success(result.message || '用户名修改成功');
      setShowUsernameDialog(false);
      setUsernameData({ newUsername: '', password: '' });
      
      setChangingUsername(false);
      refreshUser(); // 刷新用户数据
    } catch (err) {
      console.error('修改用户名失败:', err);
      toast.error(err.message || '修改用户名失败');
      setChangingUsername(false);
    }
  };

  // 处理邮箱修改 - 步骤1：发送旧邮箱验证码
  const handleSendOldEmailCode = async () => {
    setChangingEmail(true);

    try {
      const { authApi } = await import('@/lib/api');
      const result = await authApi.sendCode(
        user.email,
        'email_change_old'
      );

      toast.success(result.message || '验证码已发送到当前邮箱');
      setEmailData((prev) => ({ ...prev, oldEmailCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setChangingEmail(false);
    }
  };

  // 处理邮箱修改 - 步骤2：发送新邮箱验证码
  const handleSendNewEmailCode = async () => {
    if (!emailData.newEmail.trim()) {
      toast.error('请输入新邮箱地址');
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.newEmail)) {
      toast.error('请输入有效的邮箱地址');
      return;
    }

    setChangingEmail(true);

    try {
      const { authApi } = await import('@/lib/api');
      const result = await authApi.sendCode(
        emailData.newEmail,
        'email_change_new'
      );

      toast.success(result.message || '验证码已发送到新邮箱');
      setEmailData((prev) => ({ ...prev, newEmailCodeSent: true }));
    } catch (err) {
      console.error('发送验证码失败:', err);
      toast.error(err.message || '发送验证码失败');
    } finally {
      setChangingEmail(false);
    }
  };

  // 处理邮箱修改 - 步骤3：提交所有信息完成更换
  const handleSubmitEmailChange = async () => {
    if (!emailData.oldEmailCode.trim()) {
      toast.error('请输入旧邮箱验证码');
      return;
    }

    if (!emailData.newEmail.trim()) {
      toast.error('请输入新邮箱地址');
      return;
    }

    if (!emailData.newEmailCode.trim()) {
      toast.error('请输入新邮箱验证码');
      return;
    }

    if (settings.email_change_requires_password?.value && !emailData.password) {
      toast.error('请输入当前密码');
      return;
    }

    setChangingEmail(true);

    try {
      const result = await userApi.changeEmail(
        emailData.oldEmailCode,
        emailData.newEmail,
        emailData.newEmailCode,
        emailData.password
      );

      toast.success(result.message || '邮箱修改成功');
      setShowEmailDialog(false);
      setEmailStep(1);
      setEmailData({
        oldEmailCode: '',
        newEmail: '',
        newEmailCode: '',
        password: '',
        oldEmailCodeSent: false,
        newEmailCodeSent: false,
      });
      
      setChangingEmail(false);
      refreshUser(); // 刷新用户数据
    } catch (err) {
      console.error('邮箱修改失败:', err);
      toast.error(err.message || '邮箱修改失败');
      setChangingEmail(false);
    }
  };

  // 计算用户名修改限制信息
  const getUsernameChangeInfo = () => {
    if (!user) return null;

    const cooldownDays = settings.username_change_cooldown_days?.value || 30;
    const changeLimit = settings.username_change_limit?.value || 3;
    const changeCount = user.usernameChangeCount || 0;
    const lastChangedAt = user.usernameChangedAt;

    let canChange = true;
    let nextAvailable = null;
    let remainingChanges = changeLimit > 0 ? changeLimit - changeCount : -1;

    // 检查次数限制
    if (changeLimit > 0 && changeCount >= changeLimit) {
      canChange = false;
    }

    // 检查冷却期
    if (lastChangedAt && cooldownDays > 0) {
      const lastChange = new Date(lastChangedAt);
      const now = new Date();
      const daysSince = Math.floor((now - lastChange) / (1000 * 60 * 60 * 24));

      if (daysSince < cooldownDays) {
        canChange = false;
        nextAvailable = new Date(lastChange);
        nextAvailable.setDate(nextAvailable.getDate() + cooldownDays);
      }
    }

    return {
      canChange,
      nextAvailable,
      remainingChanges,
      cooldownDays,
    };
  };

  const usernameInfo = getUsernameChangeInfo();

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-card-foreground mb-2'>
          个人设置
        </h1>
        <p className='text-muted-foreground'>管理你的账户信息和偏好设置</p>
      </div>

      <Tabs defaultValue='profile' className='space-y-6'>
        <TabsList className='grid grid-cols-3'>
          <TabsTrigger value='profile'>
            <User className='h-4 w-4' />
            个人资料
          </TabsTrigger>
          <TabsTrigger value='privacy'>
            <Shield className='h-4 w-4' />
            隐私设置
          </TabsTrigger>
          <TabsTrigger value='security'>
            <Lock className='h-4 w-4' />
            安全设置
          </TabsTrigger>
        </TabsList>

        {/* 个人资料 Tab */}
        <TabsContent value='profile'>
          <ProfileTab
            user={user}
            settings={settings}
            formData={formData}
            onInputChange={handleInputChange}
            onAvatarChange={handleAvatarChange}
            onSubmit={handleSubmit}
            loading={loading}
            uploadingAvatar={uploadingAvatar}
            onShowUsernameDialog={() => setShowUsernameDialog(true)}
            onShowEmailDialog={() => {
              setShowEmailDialog(true);
              setEmailStep(1);
              setEmailData({
                oldEmailCode: '',
                newEmail: '',
                newEmailCode: '',
                password: '',
                oldEmailCodeSent: false,
                newEmailCodeSent: false,
              });
            }}
            usernameInfo={usernameInfo}
          />
        </TabsContent>

        {/* 隐私设置 Tab */}
        <TabsContent value='privacy'>
          <PrivacyTab
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            loading={loading}
          />
        </TabsContent>

        {/* 安全设置 Tab */}
        <TabsContent value='security'>
          <SecurityTab
            user={user}
            passwordData={passwordData}
            onPasswordChange={handlePasswordChange}
            onPasswordSubmit={handlePasswordSubmit}
            changingPassword={changingPassword}
            onEmailVerified={checkAuth}
          />
        </TabsContent>
      </Tabs>

      {/* 修改用户名对话框 */}
      <UsernameChangeDialog
        open={showUsernameDialog}
        onOpenChange={setShowUsernameDialog}
        user={user}
        settings={settings}
        usernameData={usernameData}
        onUsernameDataChange={setUsernameData}
        onSubmit={handleUsernameSubmit}
        loading={changingUsername}
        usernameInfo={usernameInfo}
      />

      {/* 修改邮箱对话框 */}
      <EmailChangeDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        user={user}
        settings={settings}
        emailStep={emailStep}
        emailData={emailData}
        onEmailDataChange={setEmailData}
        onSendOldEmailCode={handleSendOldEmailCode}
        onSendNewEmailCode={handleSendNewEmailCode}
        onSubmitEmailChange={handleSubmitEmailChange}
        loading={changingEmail}
        onStepChange={setEmailStep}
      />
    </div>
  );
}
