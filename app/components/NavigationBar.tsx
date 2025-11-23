"use client";

import React from 'react';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { User, ChefHat, Search, Bookmark, Home, Heart } from 'lucide-react';
import { getImageProxyUrl } from '@/lib/image-utils';

/**
 * ナビゲーションバーコンポーネント
 * すべての認証済みページで使用される共通ヘッダー
 */
export default function NavigationBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // 現在のパスが指定されたパスと一致するか判定
  const isActive = (path: string) => {
    if (path === '/recipes') {
      // ホーム画面は完全一致のみ
      return pathname === path;
    }
    // その他のパスは前方一致
    return pathname.startsWith(path);
  };


  return (
    <nav className="fixed inset-x-0 top-0 w-screen z-50 text-gray-800 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-700">
      {/* 上部バー */}
      <div className="flex justify-between items-center h-16 px-4 md:px-10">
        {/* 左側: ロゴとユーザー名 */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link href="/recipes" className="flex items-center flex-shrink-0">
            <Image 
              src="/myreno_icon.png" 
              width={50} 
              height={50} 
              alt="MyReno" 
              className="rounded-lg"
            />
          </Link>
          {session?.user?.name && (
            <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
              ようこそ, {session.user.name}さん
            </span>
          )}
        </div>

        {/* 右側: メニュー項目（デスクトップ）とユーザーアイコン */}
        <div className="flex items-center flex-shrink-0">
          {/* デスクトップ: メニュー項目 */}
          <div className="hidden md:flex items-center">
            <ul className="flex flex-row items-center gap-2">
              <li>
                <Link 
                  href="/recipes" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/recipes') 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  ホーム画面
                </Link>
              </li>
              <li>
                <Link 
                  href="/recipes/search" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/recipes/search') 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  探す
                </Link>
              </li>
              <li>
                <Link 
                  href="/recipes/likes" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/recipes/likes') 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  いいねしたレシピ
                </Link>
              </li>
              <li>
                <Link 
                  href="/recipes/folders" 
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/recipes/folders') 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  保存したレシピ
                </Link>
              </li>
            </ul>
          </div>
          {/* ユーザーアイコン（全画面サイズ） */}
          <Link
            href="/recipes/profile"
            className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center"
            aria-label="ユーザープロフィール"
          >
            {(() => {
              const imageUrl = getImageProxyUrl(session?.user?.image || null);
              return imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={session?.user?.name || 'ユーザー'}
                  width={32}
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
              ) : (
                <User className="w-6 h-6 text-gray-800 dark:text-gray-200" />
              );
            })()}
          </Link>
        </div>
      </div>

      {/* モバイルメニュー（横並び） */}
      <div className="md:hidden border-t border-gray-200 dark:border-zinc-700">
        <ul className="flex flex-row items-center justify-around py-2 px-2">
          <li className="flex-1">
            <Link 
              href="/recipes" 
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-md transition-colors ${
                isActive('/recipes') 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>ホーム画面</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link 
              href="/recipes/search" 
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-md transition-colors ${
                isActive('/recipes/search') 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>探す</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link 
              href="/recipes/likes" 
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-md transition-colors ${
                isActive('/recipes/likes') 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Heart className="w-5 h-5" />
              <span>いいねレシピ</span>
            </Link>
          </li>
          <li className="flex-1">
            <Link 
              href="/recipes/folders" 
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs rounded-md transition-colors ${
                isActive('/recipes/folders') 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Bookmark className="w-5 h-5" />
              <span>保存レシピ</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

