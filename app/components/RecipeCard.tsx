"use client";

import Image from "next/image";
import { Heart, Star, MessageSquare } from "lucide-react";

type RecipeCardProps = {
  recipe: {
    recipeId: number;
    title: string;
    imageUrl: string | null;
    tsukurepoCount: number;
    rank: number; // 0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない
    comment: string | null;
    isInFolder: boolean;
  };
  onLikeClick: () => void;
  onCommentClick: () => void;
  onFolderClick: () => void;
};

export default function RecipeCard({
  recipe,
  onLikeClick,
  onCommentClick,
  onFolderClick,
}: RecipeCardProps) {
  // いいねアイコンの色を決定
  const getHeartColor = () => {
    if (recipe.rank === 1) return { fill: "red", stroke: "red" };
    if (recipe.rank === 2) return { fill: "orange", stroke: "orange" };
    return { fill: "none", stroke: "currentColor" };
  };

  const heartColor = getHeartColor();

  return (
    <div className="rounded-lg overflow-hidden shadow-lg flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* 画像とタイトル（クックパッドへのリンク） */}
      <a
        href={`https://cookpad.com/jp/recipes/${recipe.recipeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-grow"
      >
        <div className="relative w-full h-40 bg-gray-200 dark:bg-zinc-800">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-zinc-500">
              <span className="text-sm">画像なし</span>
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col flex-grow">
          <h3 className="font-bold text-md mb-2 line-clamp-2">
            {recipe.title}
          </h3>
        </div>
      </a>

      {/* 操作アイコンエリア */}
      <div className="p-3 flex justify-around items-center text-xl mt-auto border-t border-gray-200 dark:border-zinc-700">
        {/* いいねボタン */}
        <button
          onClick={onLikeClick}
          className="cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1"
          aria-label="いいね"
        >
          <Heart
            fill={heartColor.fill}
            stroke={heartColor.stroke}
            className="w-5 h-5"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">いいね</span>
        </button>

        {/* フォルダーボタン */}
        <button
          onClick={onFolderClick}
          className="cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1"
          aria-label="フォルダー"
        >
          <Star
            fill={recipe.isInFolder ? "yellow" : "none"}
            stroke={recipe.isInFolder ? "black" : "currentColor"}
            className="w-5 h-5 dark:stroke-zinc-300"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">フォルダ</span>
        </button>

        {/* コメントボタン */}
        <button
          onClick={onCommentClick}
          className={`cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1 ${
            recipe.comment ? "text-blue-500" : ""
          }`}
          aria-label="コメント"
        >
          <MessageSquare
            fill={recipe.comment ? "blue" : "none"}
            stroke={recipe.comment ? "blue" : "currentColor"}
            className="w-5 h-5"
          />
          <span className={`text-xs ${recipe.comment ? "text-blue-500" : "text-gray-600 dark:text-gray-400"}`}>コメント</span>
        </button>
      </div>
    </div>
  );
}

