'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Loading } from '../Loading';

export default function ScalarAPI({ config }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // 加载 CDN 脚本
    const script = document.createElement('script');
    // script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';
    script.src =
      'https://unpkg.com/@scalar/api-reference@1.40.0/dist/browser/standalone.js';
    script.async = true;

    script.onload = () => {
      if (window.Scalar) {
        setLoading(false);
        window.Scalar.createApiReference('#ScalarAPP', config);
      }
    };

    document.body.appendChild(script);

    return () => script.remove();
  }, []);

  return (
    <>
      {loading && <Loading className='py-16' />}
      <div id='ScalarAPP' />
    </>
  );
}
