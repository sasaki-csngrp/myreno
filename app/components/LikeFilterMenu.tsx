"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";

/**
 * いいねフィルタメニューコンポーネント（いいねページ専用）
 * めっちゃ好き/まあまあ
 */
export default function LikeFilterMenu() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentRank = searchParams.get("rank") || "1"; // デフォルトは「めっちゃ好き」

  const rankOptions = [
    {
      rank: "1",
      label: (
        <>
          <Heart fill="red" stroke="red" size={16} /> めっちゃ好き
        </>
      ),
    },
    {
      rank: "2",
      label: (
        <>
          <Heart fill="orange" stroke="orange" size={16} /> まあまあ
        </>
      ),
    },
  ];

  const createPageURL = (rank: string) => {
    const params = new URLSearchParams();
    params.set("rank", rank);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-center gap-4">
        {rankOptions.map(({ rank, label }) => (
          <button
            key={rank}
            onClick={() => router.push(createPageURL(rank))}
            className={`inline-flex items-center gap-1.5 px-2 py-2 text-center whitespace-nowrap ${
              currentRank === rank ? "text-blue-500" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

