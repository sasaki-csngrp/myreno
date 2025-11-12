# フェーズ1.5: ナビゲーションバーの実装 詳細プラン

## 1. 概要

### 1.1 目的
すべての認証済みページで共通して使用するナビゲーションバーを実装します。つくおめの実装を踏襲し、固定ヘッダー、ロゴ表示、ユーザー名表示、メニュー項目、レスポンシブ対応（ハンバーガーメニュー）を実装します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- NextAuth.jsが既にセットアップされていること

---

## 2. ナビゲーションバーコンポーネントの作成

### 2.1 コンポーネントファイルの作成

`app/components/NavigationBar.tsx`を作成します。

### 2.2 実装内容

```typescript
"use client";

import React, { useState } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from 'next-auth/react';
import { Menu, X } from 'lucide-react';

/**
 * ナビゲーションバーコンポーネント
 * すべての認証済みページで使用される共通ヘッダー
 */
export default function NavigationBar() {
  // スマホ画面でのハンバーガーメニューオープン状態
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const handleMenuToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuClose = () => {
    setIsOpen(false);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="fixed inset-x-0 top-0 w-screen z-50 px-4 md:px-10 text-gray-800 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
      <div className="flex justify-between items-center h-16">
        {/* 左側: ロゴとユーザー名 */}
        <div className="flex items-center gap-4">
          <Link href="/recipes" className="flex items-center">
            <Image 
              src="/myreno_icon.png" 
              width={50} 
              height={50} 
              alt="MyReno" 
              className="rounded-lg"
            />
          </Link>
          {session?.user?.name && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ようこそ, {session.user.name}さん
            </span>
          )}
        </div>

        {/* 右側: メニュー項目（デスクトップ） */}
        <div className="hidden md:flex items-center">
          <ul className="flex flex-row items-center gap-2">
            <li>
              <Link 
                href="/recipes" 
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                レシピ一覧
              </Link>
            </li>
            <li>
              <Link 
                href="/recipes/tags" 
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                タグ検索
              </Link>
            </li>
            <li>
              <Link 
                href="/recipes/folders" 
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
              >
                フォルダ
              </Link>
            </li>
            <li>
              <button 
                onClick={handleLogout}
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-red-600 dark:text-red-400"
              >
                ログアウト
              </button>
            </li>
          </ul>
        </div>

        {/* ハンバーガーメニューボタン（モバイル） */}
        <button 
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          onClick={handleMenuToggle}
          aria-label="メニューを開く"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* モバイルメニュー（折りたたみ） */}
      <div className={`md:hidden border-t border-gray-200 dark:border-zinc-700 ${isOpen ? 'block' : 'hidden'}`}>
        <ul className="flex flex-col py-2">
          <li>
            <Link 
              href="/recipes" 
              onClick={handleMenuClose}
              className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              レシピ一覧
            </Link>
          </li>
          <li>
            <Link 
              href="/recipes/tags" 
              onClick={handleMenuClose}
              className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              タグ検索
            </Link>
          </li>
          <li>
            <Link 
              href="/recipes/folders" 
              onClick={handleMenuClose}
              className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              フォルダ
            </Link>
          </li>
          <li>
            <button 
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-red-600 dark:text-red-400"
            >
              ログアウト
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
```

### 2.3 実装のポイント

1. **固定ヘッダー**: `fixed inset-x-0 top-0`で画面上部に固定
2. **z-index**: `z-50`で他の要素の上に表示
3. **レスポンシブ**: `md:hidden`と`hidden md:flex`でデスクトップ/モバイルを切り替え
4. **ダークモード対応**: `dark:`プレフィックスでダークモードスタイルを適用
5. **セッション管理**: `useSession`でセッション情報を取得
6. **ログアウト**: `signOut`でログアウト処理

---

## 3. レイアウトへの統合

### 3.1 レイアウトファイルの作成

`app/recipes/layout.tsx`にナビゲーションバーを追加します。レシピ関連のページのみにナビゲーションバーを表示します。

### 3.2 app/recipes/layout.tsxの実装

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import NavigationBar from '@/app/components/NavigationBar';
import { SessionProvider } from '@/app/components/SessionProvider';

export default async function RecipesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <NavigationBar />
      <div className="pt-16">
        {children}
      </div>
    </SessionProvider>
  );
}
```

**注意**: `SessionProvider`は、クライアントコンポーネントで`useSession`を使用するために必要です。

### 3.3 SessionProviderコンポーネントの作成（必須）

`app/components/SessionProvider.tsx`を作成：

```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { Session } from "next-auth";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}
```


---

## 4. スタイルの調整

### 4.1 パディングの調整

ナビゲーションバーの高さ（`h-16`）に合わせて、コンテンツエリアのパディングを調整します。

### 4.2 ロゴ画像の準備

`public/myreno_icon.png`を配置します。つくおめのロゴを参考に、適切なサイズ（50x50px推奨）の画像を準備します。

---

## 5. 動作確認

### 5.1 デスクトップでの確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:3050/recipes`にアクセス

3. 以下の確認を行います：
   - ナビゲーションバーが画面上部に固定表示されている
   - ロゴが表示されている
   - ユーザー名が表示されている
   - メニュー項目が表示されている
   - 各メニュー項目をクリックしてページ遷移が正常に動作する
   - ログアウトボタンをクリックしてログアウトが正常に動作する

### 5.2 モバイルでの確認

1. ブラウザの開発者ツールでモバイル表示に切り替え

2. 以下の確認を行います：
   - ハンバーガーメニューボタンが表示されている
   - ハンバーガーメニューボタンをクリックしてメニューが開閉する
   - メニュー項目をクリックしてページ遷移が正常に動作する
   - メニューを開いた後、項目をクリックするとメニューが閉じる

### 5.3 ダークモードでの確認

1. ブラウザのダークモード設定を有効化

2. 以下の確認を行います：
   - ナビゲーションバーの背景色がダークモードに対応している
   - テキストの色が適切に表示されている
   - ホバー時の背景色が適切に表示されている

---

## 6. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] `app/components/NavigationBar.tsx`が作成されている
- [ ] ナビゲーションバーがすべての認証済みページで表示される
- [ ] ロゴが表示されている
- [ ] ユーザー名が表示されている
- [ ] メニュー項目が正常に動作する（ページ遷移）
- [ ] レスポンシブデザインが正常に動作する（モバイルでハンバーガーメニュー）
- [ ] ログアウト機能が正常に動作する
- [ ] ダークモードに対応している
- [ ] エラーが発生していない

---

## 7. 次のステップ

フェーズ1.5が完了したら、**フェーズ2: レシピ一覧表示機能（基本）**に進みます。

---

## 8. 参考資料

- `docs/01_REQUIREMENTS.md` の7.1.1節（ナビゲーションバー）
- `/root/tukuome3v2/app/components/NavBar.tsx`（つくおめの実装参考）
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [lucide-react Icons](https://lucide.dev/)

---

## 9. トラブルシューティング

### 9.1 よくあるエラーと対処法

**エラー: useSession must be used within a SessionProvider**
- `SessionProvider`でコンポーネントをラップする必要があります
- `app/components/SessionProvider.tsx`を作成して使用

**エラー: Image optimization requires a width or height**
- `Image`コンポーネントに`width`と`height`を指定

**エラー: ナビゲーションバーが表示されない**
- レイアウトファイルにナビゲーションバーが追加されているか確認
- `pt-16`（パディングトップ）が設定されているか確認

**エラー: ハンバーガーメニューが動作しない**
- `useState`が正しくインポートされているか確認
- イベントハンドラーが正しく設定されているか確認

---

## 10. 更新履歴

- 2024-XX-XX: 初版作成

