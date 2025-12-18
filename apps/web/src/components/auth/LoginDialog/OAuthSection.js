import { OAuthButton } from './OAuthButton';

export function OAuthSection({ providers, isLogin, isLoading, setIsLoading, setError }) {
  if (!providers || providers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            或使用以下方式{isLogin ? '登录' : '注册'}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {providers.map((provider) => (
          <OAuthButton
            key={provider.provider}
            provider={provider}
            isLogin={isLogin}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setError={setError}
          />
        ))}
      </div>
    </>
  );
}
