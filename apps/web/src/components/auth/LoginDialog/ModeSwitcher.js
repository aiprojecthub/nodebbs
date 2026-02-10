import { Button } from '@/components/ui/button';

export function ModeSwitcher({
  mode,
  registrationMode,
  isLoading,
  loadingSettings,
  onModeChange
}) {
  if (loadingSettings) return null;

  const isLogin = mode === 'login';
  const isForgotPassword = mode === 'forgot-password';

  if (isForgotPassword) {
    return (
      <div className="text-center text-sm space-y-2 mt-2">
        <Button
          variant="link"
          className="p-0 h-auto font-normal"
          onClick={() => onModeChange('login')}
          disabled={isLoading}
        >
          返回登录
        </Button>
      </div>
    );
  }

  if (registrationMode === 'closed') {
    if (isLogin) {
      return (
        <div className="text-center text-sm space-y-2 mt-2">
          <p className="text-muted-foreground text-xs">
            系统当前已关闭用户注册
          </p>
        </div>
      );
    } else {
      return (
        <div className="text-center text-sm space-y-2 mt-2">
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => onModeChange('login')}
            disabled={isLoading}
          >
            返回登录
          </Button>
        </div>
      );
    }
  }

  return (
    <div className="text-center text-sm space-y-2 mt-2">
      <Button
        variant="link"
        className="p-0 h-auto font-normal"
        onClick={() => onModeChange(isLogin ? 'register' : 'login')}
        disabled={isLoading}
      >
        {isLogin ? '还没有账户？立即注册' : '已有账户？立即登录'}
      </Button>
      {!isLogin && registrationMode === 'invitation' && (
        <p className="text-muted-foreground text-xs">
          需要邀请码才能注册
        </p>
      )}
    </div>
  );
}
