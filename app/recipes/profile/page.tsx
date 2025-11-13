import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutButton from '../logout-button';
import { User } from 'lucide-react';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 pt-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
          ユーザープロフィール
        </h1>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
          {/* ユーザーアイコンと名前 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user?.name || 'ユーザー'}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                {session.user?.name || 'ユーザー'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </p>
            </div>
          </div>

          {/* ユーザー情報 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ユーザー名
              </label>
              <p className="mt-1 text-gray-900 dark:text-zinc-50">
                {session.user?.name || '未設定'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <p className="mt-1 text-gray-900 dark:text-zinc-50">
                {session.user?.email || '未設定'}
              </p>
            </div>
          </div>

          {/* ログアウトボタン */}
          <div className="pt-6 border-t border-gray-200 dark:border-zinc-700">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}

