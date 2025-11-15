import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutButton from '../logout-button';
import ProfileImageUpload from '@/app/components/ProfileImageUpload';

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
          {/* プロフィール画像アップロード */}
          <div className="mb-6">
            <ProfileImageUpload currentImageUrl={session.user?.image || null} />
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

