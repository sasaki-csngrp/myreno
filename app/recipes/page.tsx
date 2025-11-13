"use client";

import { useRouter } from "next/navigation";
import { UtensilsCrossed, ChefHat, Cake, Cookie, FolderOpen } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const handleTagClick = (tagName: string) => {
    router.push(`/recipes/tags?tag=${encodeURIComponent(tagName)}`);
  };

  const handleButtonClick = (button: { label: string; tagName?: string; href?: string }) => {
    if (button.href) {
      router.push(button.href);
    } else if (button.tagName) {
      handleTagClick(button.tagName);
    }
  };

  const buttons = [
    { label: "食材を指定してレシピを探す", tagName: "素材別", icon: UtensilsCrossed },
    { label: "料理の名前や種類でレシピを探す", tagName: "料理", icon: ChefHat },
    { label: "お菓子のレシピを探す", tagName: "お菓子", icon: Cake },
    { label: "パンのレシピを探す", tagName: "パン", icon: Cookie },
    { label: "保存したレシピを見る", href: "/recipes/folders", icon: FolderOpen },
  ];

  return (
    <div className="p-4 pt-[100px] md:pt-[130px]">
      <h1 className="text-3xl font-bold mb-8">ホーム</h1>
      <div className="grid grid-cols-1 gap-4 max-w-4xl">
        {buttons.map((button, index) => {
          const Icon = button.icon;
          return (
            <button
              key={index}
              onClick={() => handleButtonClick(button)}
              className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200/50 dark:border-cyan-800/50 text-gray-800 dark:text-gray-200 font-semibold py-6 px-6 rounded-xl text-lg transition-all duration-300 shadow-sm hover:shadow-xl hover:scale-[1.02] text-left flex items-center gap-4 hover:border-cyan-300 dark:hover:border-cyan-700"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 dark:from-cyan-600 dark:to-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                <Icon className="w-6 h-6" />
              </div>
              <span className="flex-1">{button.label}</span>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg
                  className="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

