import ScalarAPI from '@/components/common/ScalarAPI';
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
