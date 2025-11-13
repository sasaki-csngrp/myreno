'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登録に失敗しました');
      } else {
        setSuccess(true);
        // フォームをクリア
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (err) {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">新規登録</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            myrenoのアカウントを作成してください
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-6 dark:bg-green-900/20">
              <div className="text-center mb-4">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-lg font-bold text-green-800 dark:text-green-400 mb-2">
                  認証メールを送信しました
                </h2>
              </div>
              <div className="text-left">
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  ご登録ありがとうございます！<br />
                  登録されたメールアドレスに確認メールを送信しました。<br />
                  メール内のリンクをクリックしてメールアドレスを確認してください。
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mb-4">
                  ※メールが届かない場合は、迷惑メールフォルダもご確認ください。
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-block rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
                >
                  ログインページへ
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              名前（任意）
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              disabled={isLoading}
              className="mt-1 w-full rounded-md border border-zinc-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
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
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              minLength={8}
              disabled={isLoading}
              className="mt-1 w-full rounded-md border border-zinc-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              パスワードは8文字以上で入力してください
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '登録中...' : '登録'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-500 hover:underline dark:text-blue-400">
            既にアカウントをお持ちの方はこちら
          </Link>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

