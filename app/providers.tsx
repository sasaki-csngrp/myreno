'use client';

import { SessionProvider } from 'next-auth/react';
import SplashScreen from './components/SplashScreen';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SplashScreen />
      {children}
    </SessionProvider>
  );
}

