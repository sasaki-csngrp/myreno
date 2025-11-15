"use client";

import { useState, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { searchModes } from "@/lib/constants";
import { Loader2 } from "lucide-react";

/**
 * 分類フィルタメニューコンポーネント
 * すべて/主菜/副菜/その他
 * つくおめのUIに合わせて、選択対象を文字列で並べて、選択されているものを色替え表示
 */
export default function SearchModeMenu() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [loadingMode, setLoadingMode] = useState<string | null>(null);

  const currentMode = searchParams.get("mode") || "all";

  // URLが変更されたらローディングを解除
  useEffect(() => {
    setLoadingMode(null);
  }, [currentMode]);

  const createPageURL = (mode: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", mode);
    return `${pathname}?${params.toString()}`;
  };

  const handleModeClick = (mode: string) => {
    if (mode === currentMode) return; // 既に選択されている場合は何もしない
    setLoadingMode(mode);
    router.push(createPageURL(mode));
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-around">
        {searchModes.map(({ mode, label, icon: Icon }) => {
          const isLoading = loadingMode === mode;
          const isSelected = currentMode === mode;
          
          return (
            <button
              key={mode}
              onClick={() => handleModeClick(mode)}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-2 py-2 text-center whitespace-nowrap transition-opacity ${
                isSelected ? "text-blue-500" : ""
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>読み込み中...</span>
                </>
              ) : (
                <>
                  <Icon size={16} />
                  {label}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

