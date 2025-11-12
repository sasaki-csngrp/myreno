"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import RecipeCard from "./RecipeCard";
import { getRecipes } from "@/lib/actions/recipes";

type Recipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  tsukurepoCount: number;
  rank: number;
  comment: string | null;
  isInFolder: boolean;
};

interface RecipeListWithLoadMoreProps {
  initialRecipes: Recipe[];
  initialHasMore: boolean;
}

const ITEMS_PER_PAGE = 12;

export default function RecipeListWithLoadMore({
  initialRecipes,
  initialHasMore,
}: RecipeListWithLoadMoreProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [offset, setOffset] = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMoreRecipes = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { recipes: newRecipes, hasMore: newHasMore } = await getRecipes(
        offset,
        ITEMS_PER_PAGE
      );
      setRecipes((prevRecipes) => [...prevRecipes, ...newRecipes]);
      setOffset((prevOffset) => prevOffset + newRecipes.length);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("レシピの読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [offset, hasMore, loading]);

  // Intersection Observer で自動的に「もっと見る」を実行
  useEffect(() => {
    const observerElement = loadMoreRef.current;
    if (!observerElement || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreRecipes();
        }
      },
      {
        root: null,
        rootMargin: "100px", // 100px手前で発火
        threshold: 0.1,
      }
    );

    observer.observe(observerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMoreRecipes]);

  const handleLikeClick = (recipeId: number) => {
    // フェーズ4で実装
    console.log(`いいねダイアログを開く（レシピID: ${recipeId}、フェーズ4で実装）`);
  };

  const handleCommentClick = (recipeId: number) => {
    // フェーズ4で実装
    console.log(`コメントダイアログを開く（レシピID: ${recipeId}、フェーズ4で実装）`);
  };

  const handleFolderClick = (recipeId: number) => {
    // フェーズ4で実装
    console.log(`フォルダーダイアログを開く（レシピID: ${recipeId}、フェーズ4で実装）`);
  };

  return (
    <div>
      {/* グリッドレイアウト */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.recipeId}
            recipe={recipe}
            onLikeClick={() => handleLikeClick(recipe.recipeId)}
            onCommentClick={() => handleCommentClick(recipe.recipeId)}
            onFolderClick={() => handleFolderClick(recipe.recipeId)}
          />
        ))}
      </div>

      {/* 読み込み中表示 */}
      {loading && (
        <div className="flex justify-center mt-8">
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      )}

      {/* Intersection Observer用の監視要素 */}
      {hasMore && <div ref={loadMoreRef} className="h-1 w-full" />}
    </div>
  );
}

