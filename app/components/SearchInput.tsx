"use client";

import { useState, KeyboardEvent, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

/**
 * 検索入力コンポーネント
 * タイトル検索またはレシピID検索
 * つくおめのUIに合わせて、シンプルなinput要素を使用
 */
const SearchInput = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  // URLパラメータから初期値を取得
  const initialSearchTerm = searchParams.get("title") || "";
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  
  // URLパラメータが変更されたときに状態を更新
  useEffect(() => {
    const currentTitle = searchParams.get("title") || "";
    setSearchTerm(currentTitle);
  }, [searchParams]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const params = new URLSearchParams();
      
      // 検索ページの場合は title だけを設定
      if (pathname === "/recipes/search") {
        if (searchTerm) {
          params.set("title", searchTerm);
        }
      } else {
        // それ以外のページ（/recipes/list など）では既存のパラメータを維持
        if (searchTerm) {
          if (/^[0-9]+$/.test(searchTerm)) {
            // 数字のみの場合はtitleだけを設定
            params.set("title", searchTerm);
          } else {
            // それ以外の場合は既存のパラメータを維持しつつtitleを設定
            const existingParams = new URLSearchParams(searchParams);
            existingParams.forEach((value, key) => {
              params.set(key, value);
            });
            params.set("title", searchTerm);
            params.delete("tag"); // tagは削除
          }
        } else {
          // 検索語が空の場合はtitleを削除
          const existingParams = new URLSearchParams(searchParams);
          existingParams.delete("title");
          existingParams.forEach((value, key) => {
            params.set(key, value);
          });
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 shadow-md">
      <label htmlFor="search-title" className="sr-only">
        探す
      </label>
      <input
        type="text"
        id="search-title"
        placeholder="探したいレシピタイトルを入力"
        className="w-full p-2 border border-gray-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default SearchInput;

