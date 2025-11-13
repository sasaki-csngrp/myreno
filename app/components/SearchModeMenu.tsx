"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { searchModes } from "@/lib/constants";

/**
 * 分類フィルタメニューコンポーネント
 * すべて/主菜/副菜/その他
 * つくおめのUIに合わせて、選択対象を文字列で並べて、選択されているものを色替え表示
 */
export default function SearchModeMenu() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentMode = searchParams.get("mode") || "all";

  const createPageURL = (mode: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", mode);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-around">
        {searchModes.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => router.push(createPageURL(mode))}
            className={`inline-flex items-center gap-1.5 px-2 py-2 text-center whitespace-nowrap ${
              currentMode === mode ? "text-blue-500" : ""
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

