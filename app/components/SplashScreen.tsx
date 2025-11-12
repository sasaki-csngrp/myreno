'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 3秒後にスプラッシュ画面を非表示にする
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center justify-center">
        <Image
          src="/myreno_sprash.png"
          alt="Splash Screen"
          width={400}
          height={400}
          priority
          className="animate-pulse"
        />
      </div>
    </div>
  );
}

