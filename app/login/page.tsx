'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLパラメータからエラーを取得
    const errorParam = searchParams.get('error');
    if (errorParam === 'OAuthAccountNotLinked') {
      setError('このメールアドレスは既にメール認証で登録されています。メール認証でログインしてください。');
    } else if (errorParam) {
      setError('認証に失敗しました。もう一度お試しください。');
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn('email', {
        email,
        callbackUrl: '/recipes',
        redirect: false,
      });
      
      if (result?.error) {
        setError('メール送信に失敗しました。もう一度お試しください。');
      } else {
        // メール送信成功時は確認ページにリダイレクト
        router.push('/verify-email');
      }
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn('google', { callbackUrl: '/recipes' });
    } catch (err) {
      setError('Google認証に失敗しました。もう一度お試しください。');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">ログイン</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            レノちゃんにログインしてください
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            初めての方は、メールアドレスまたはGoogleアカウントでログインすると自動的にアカウントが作成されます
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* メール認証フォーム */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
              className="mt-1 w-full rounded-md border border-zinc-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '送信中...' : 'メールでログイン'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              または
            </span>
          </div>
        </div>

        {/* Google認証ボタン */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
}

