export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
            メールを確認してください
          </h1>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            ログインリンクをメールアドレスに送信しました。
            <br />
            メール内のリンクをクリックしてログインを完了してください。
          </p>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}

