'use client';

import { ProgressProvider } from '@bprogress/next/app';

const ProgressBar = ({ children }) => {
  return (
    <ProgressProvider
      height="4px"
      color="var(--primary)"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
    </ProgressProvider>
  );
};

export default ProgressBar;
