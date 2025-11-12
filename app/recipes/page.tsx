import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutButton from './logout-button';

export default async function RecipesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                レシピ一覧
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                認証テストページ
              </p>
            </div>
            <LogoutButton />
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
                セッション情報
              </h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    ユーザーID:
                  </span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    {session.user?.id || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    メールアドレス:
                  </span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    {session.user?.email || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    名前:
                  </span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    {session.user?.name || '未設定'}
                  </span>
                </div>
                {session.user?.image && (
                  <div>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      画像:
                    </span>
                    <img
                      src={session.user.image}
                      alt="User"
                      className="ml-2 mt-2 h-16 w-16 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-blue-50 p-4 dark:border-zinc-700 dark:bg-blue-900/20">
              <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
                認証成功！
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                メール認証またはGoogle認証が正常に完了しました。
                <br />
                このページは認証が必要なページのテストページです。
              </p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <h2 className="mb-2 text-lg font-semibold text-black dark:text-zinc-50">
                次のステップ
              </h2>
              <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>レシピ一覧機能の実装</li>
                <li>レシピ詳細ページの作成</li>
                <li>レシピ作成・編集機能の追加</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

