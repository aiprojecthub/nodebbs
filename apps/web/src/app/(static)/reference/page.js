import ScalarAPI from '@/components/common/ScalarAPI';

export const metadata = {
  title: 'API 文档',
  description: 'NodeBBS API 参考文档，包含完整的接口定义和使用说明。',
};

export default function ApiReference() {
  const url = `/docs/json`;
  const config = {
    url,
    theme: 'alternate',
    customCss: `.scalar-app .h-dvh{height: calc(100dvh - 58px); top: 58px}`,
    defaultHttpClient: {
      targetKey: 'node',
      clientKey: 'fetch',
    },
  };
  return <ScalarAPI config={config} />;
}
