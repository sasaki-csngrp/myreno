"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import SearchModeMenu from "./SearchModeMenu";

/**
 * レシピ検索・フィルタリングコントロールコンポーネント
 * レスポンシブ対応（PC: 常に表示、タブレット・スマホ: 折りたたみ表示）
 */
export default function RecipeFilterControls() {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchParams = useSearchParams();

  // 検索条件変更時に自動で折りたたむ
  useEffect(() => {
    setIsExpanded(false);
  }, [searchParams]);

  return (
    <div className="fixed top-[137px] md:top-[65px] left-0 right-0 z-40 bg-white shadow-md p-4">
      <div className="flex justify-end lg:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label={isExpanded ? "フィルターを閉じる" : "フィルターを開く"}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={20} />
              <span className="text-sm">検索条件を閉じる</span>
            </>
          ) : (
            <>
              <ChevronDown size={20} />
              <span className="text-sm">検索条件を開く</span>
            </>
          )}
        </button>
      </div>
      <div
        className={`flex-col lg:flex-row items-center justify-between gap-2 ${
          isExpanded ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="w-full border border-gray-300 rounded-md p-2">
          <SearchModeMenu />
        </div>
      </div>
    </div>
  );
}

