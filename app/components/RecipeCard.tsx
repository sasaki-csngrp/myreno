"use client";

import Image from "next/image";
import { Heart, HeartOff, Bookmark, BookmarkCheck, MessageSquare, Loader2 } from "lucide-react";
import { recordRecipeView } from "@/lib/actions/recipes";

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
  isSaving?: boolean;
  isUpdatingLike?: boolean;
  isUpdatingComment?: boolean;
};

export default function RecipeCard({
  recipe,
  onLikeClick,
  onCommentClick,
  onFolderClick,
  isSaving = false,
  isUpdatingLike = false,
  isUpdatingComment = false,
}: RecipeCardProps) {
  // いいねアイコンの色とアイコンタイプを決定
  const getHeartIcon = () => {
    if (recipe.rank === 1) return { icon: Heart, fill: "red", stroke: "red" };
    if (recipe.rank === 2) return { icon: Heart, fill: "orange", stroke: "orange" };
    if (recipe.rank === 9) return { icon: HeartOff, fill: "#9333ea", stroke: "#9333ea" };
    return { icon: Heart, fill: "none", stroke: "currentColor" };
  };

  const heartIcon = getHeartIcon();
  const HeartIcon = heartIcon.icon;

  // タイトルから「 by 作者名」の部分を削除してレシピ名だけを取得
  const getRecipeNameOnly = (title: string): string => {
    const byIndex = title.indexOf(" by ");
    if (byIndex !== -1) {
      return title.substring(0, byIndex);
    }
    return title;
  };

  const displayTitle = getRecipeNameOnly(recipe.title);

  const handleRecipeClick = async () => {
    try {
      await recordRecipeView(recipe.recipeId);
    } catch (error) {
      // エラーが発生してもレシピのリンクは開く
      console.error("閲覧履歴の記録に失敗しました:", error);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-lg flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* 画像とタイトル（クックパッドへのリンク） */}
      <a
        href={`https://cookpad.com/jp/recipes/${recipe.recipeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-grow"
        onClick={handleRecipeClick}
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
          <h3 className="font-bold text-md mb-2 line-clamp-3">
            {displayTitle}
          </h3>
        </div>
      </a>

      {/* 操作アイコンエリア */}
      <div className="p-3 flex justify-around items-center text-xl mt-auto border-t border-gray-200 dark:border-zinc-700">
        {/* いいねボタン */}
        <button
          onClick={onLikeClick}
          disabled={isUpdatingLike}
          className={`cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1 ${
            isUpdatingLike ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label="いいね"
        >
          {isUpdatingLike ? (
            <>
              <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
              <span className="text-xs text-gray-600 dark:text-gray-400">更新中...</span>
            </>
          ) : (
            <>
              <HeartIcon
                fill={heartIcon.fill}
                stroke={heartIcon.stroke}
                className="w-5 h-5"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">いいね</span>
            </>
          )}
        </button>

        {/* コメントボタン */}
        <button
          onClick={onCommentClick}
          disabled={isUpdatingComment}
          className={`cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1 ${
            recipe.comment && !isUpdatingComment ? "text-blue-500" : ""
          } ${isUpdatingComment ? "opacity-50 cursor-not-allowed" : ""}`}
          aria-label="コメント"
        >
          {isUpdatingComment ? (
            <>
              <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
              <span className="text-xs text-gray-600 dark:text-gray-400">更新中...</span>
            </>
          ) : (
            <>
              <MessageSquare
                fill={recipe.comment ? "blue" : "none"}
                stroke={recipe.comment ? "blue" : "currentColor"}
                className="w-5 h-5"
              />
              <span className={`text-xs ${recipe.comment ? "text-blue-500" : "text-gray-600 dark:text-gray-400"}`}>コメント</span>
            </>
          )}
        </button>

        {/* フォルダーボタン */}
        <button
          onClick={onFolderClick}
          disabled={isSaving}
          className={`cursor-pointer hover:opacity-70 transition-opacity flex flex-col items-center gap-1 ${
            isSaving ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label={recipe.isInFolder ? "保存済み" : "保存する"}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-spin" />
              <span className="text-xs text-gray-600 dark:text-gray-400">保存中...</span>
            </>
          ) : (
            <>
              {recipe.isInFolder ? (
                <BookmarkCheck
                  fill="currentColor"
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-700 dark:text-gray-300"
                />
              ) : (
                <Bookmark
                  fill="none"
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                />
              )}
              <span className={`text-xs ${recipe.isInFolder ? "text-gray-700 dark:text-gray-300" : "text-gray-600 dark:text-gray-400"}`}>
                {recipe.isInFolder ? "保存済み" : "保存する"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

