"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import RecipeCard from "./RecipeCard";
import LikeDialog from "./LikeDialog";
import CommentDialog from "./CommentDialog";
import FolderDialog from "./FolderDialog";
import { getFilteredRecipes, updateRank, updateComment, fetchFolders } from "@/lib/actions/recipes";

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
  searchTerm?: string;
  searchMode?: string;
  searchTag?: string;
  folderName?: string;
  searchRank?: string;
}

const ITEMS_PER_PAGE = 12;

export default function RecipeListWithLoadMore({
  initialRecipes,
  initialHasMore,
  searchTerm = "",
  searchMode = "all",
  searchTag = "",
  folderName = "",
  searchRank = "all",
}: RecipeListWithLoadMoreProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [offset, setOffset] = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const prevSearchParamsRef = useRef<string>(searchParams.toString());

  // モーダルダイアログの状態管理
  const [likeDialogOpen, setLikeDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // 検索パラメータの変更を監視
  useEffect(() => {
    const currentSearchParams = searchParams.toString();
    
    // 検索パラメータが変更された場合（初回は除く）
    if (prevSearchParamsRef.current && prevSearchParamsRef.current !== currentSearchParams) {
      setIsSearching(true);
    }
    
    prevSearchParamsRef.current = currentSearchParams;
  }, [searchParams]);

  // データが更新されたらローディングを解除
  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialRecipes, isSearching]);

  // 検索条件が変更されたときにリセット
  useEffect(() => {
    setRecipes(initialRecipes);
    setOffset(initialRecipes.length);
    setHasMore(initialHasMore);
  }, [initialRecipes, initialHasMore, searchTerm, searchMode, searchTag, searchRank]);

  const loadMoreRecipes = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { recipes: newRecipes, hasMore: newHasMore } =
        await getFilteredRecipes(
          offset,
          ITEMS_PER_PAGE,
          searchTerm,
          searchMode as "all" | "main_dish" | "sub_dish" | "others",
          searchTag,
          folderName,
          searchRank as "all" | "1" | "2"
        );
      setRecipes((prevRecipes) => [...prevRecipes, ...newRecipes]);
      setOffset((prevOffset) => prevOffset + newRecipes.length);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("レシピの読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [
    offset,
    hasMore,
    loading,
    searchTerm,
    searchMode,
    searchTag,
    folderName,
    searchRank,
  ]);

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

  const handleLikeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLikeDialogOpen(true);
  };

  const handleCommentClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCommentDialogOpen(true);
  };

  const handleFolderClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFolderDialogOpen(true);
  };

  const handleLikeSubmit = async (rank: number) => {
    if (!selectedRecipe) return;
    try {
      await updateRank(selectedRecipe.recipeId, rank);
      // レシピの状態を更新
      setRecipes((prevRecipes) =>
        prevRecipes.map((r) =>
          r.recipeId === selectedRecipe.recipeId ? { ...r, rank } : r
        )
      );
    } catch (error) {
      console.error("評価の更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "評価の更新に失敗しました");
    }
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedRecipe) return;
    try {
      await updateComment(selectedRecipe.recipeId, comment);
      // レシピの状態を更新
      setRecipes((prevRecipes) =>
        prevRecipes.map((r) =>
          r.recipeId === selectedRecipe.recipeId
            ? { ...r, comment: comment.trim() || null }
            : r
        )
      );
    } catch (error) {
      console.error("コメントの更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "コメントの更新に失敗しました");
    }
  };

  const handleFolderChange = async () => {
    if (!selectedRecipe) return;
    try {
      // フォルダー状態を再取得するために、該当レシピのフォルダー情報を取得
      const folders = await fetchFolders(selectedRecipe.recipeId);
      const isInAnyFolder = folders.some((f) => f.isInFolder);
      
      // レシピの状態を更新
      setRecipes((prevRecipes) =>
        prevRecipes.map((r) =>
          r.recipeId === selectedRecipe.recipeId
            ? { ...r, isInFolder: isInAnyFolder }
            : r
        )
      );
    } catch (error) {
      console.error("フォルダー状態の更新に失敗しました:", error);
    }
  };

  return (
    <div>
      {/* 検索中のローディング表示 */}
      {isSearching && (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
          </div>
        </div>
      )}

      {/* グリッドレイアウト */}
      {!isSearching && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onLikeClick={() => handleLikeClick(recipe)}
                onCommentClick={() => handleCommentClick(recipe)}
                onFolderClick={() => handleFolderClick(recipe)}
              />
            ))}
          </div>

          {/* 読み込み中表示（追加読み込み時） */}
          {loading && (
            <div className="flex justify-center mt-8">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400"></div>
                <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
              </div>
            </div>
          )}

          {/* Intersection Observer用の監視要素 */}
          {hasMore && <div ref={loadMoreRef} className="h-1 w-full" />}
        </>
      )}

      {/* モーダルダイアログ */}
      {selectedRecipe && (
        <>
          <LikeDialog
            isOpen={likeDialogOpen}
            currentRank={selectedRecipe.rank}
            onClose={() => setLikeDialogOpen(false)}
            onSubmit={handleLikeSubmit}
          />
          <CommentDialog
            isOpen={commentDialogOpen}
            recipeName={selectedRecipe.title}
            currentComment={selectedRecipe.comment}
            onClose={() => setCommentDialogOpen(false)}
            onSubmit={handleCommentSubmit}
          />
          <FolderDialog
            isOpen={folderDialogOpen}
            onOpenChange={setFolderDialogOpen}
            recipe={{
              recipeId: selectedRecipe.recipeId,
              title: selectedRecipe.title,
              imageUrl: selectedRecipe.imageUrl,
            }}
            onFolderChange={handleFolderChange}
          />
        </>
      )}
    </div>
  );
}

