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
                className="block px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-blue-600 dark:text-blue-400"
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
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-blue-600 dark:text-blue-400"
            >
              ログアウト
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

