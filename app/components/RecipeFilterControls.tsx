"use client";

import SearchModeMenu from "./SearchModeMenu";

/**
 * レシピ検索・フィルタリングコントロールコンポーネント
 * 食材指定の場合に常時表示
 */
export default function RecipeFilterControls() {
  return (
    <div className="fixed top-[137px] md:top-[65px] left-0 right-0 z-40 bg-white shadow-md p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="w-full border border-gray-300 rounded-md p-2">
          <SearchModeMenu />
        </div>
      </div>
    </div>
  );
}

