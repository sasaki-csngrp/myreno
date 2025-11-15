"use client";

import { useRouter } from "next/navigation";
import TagCard, { TagData } from "@/app/components/TagCard";
import RecipeCard from "@/app/components/RecipeCard";
import LikeDialog from "@/app/components/LikeDialog";
import CommentDialog from "@/app/components/CommentDialog";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { updateRank, updateComment, isRecipeInFolder, addRecipeToFolder, removeRecipeFromFolder } from "@/lib/actions/recipes";

type Recipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  tsukurepoCount: number;
  rank: number;
  comment: string | null;
  isInFolder: boolean;
};

interface HomePageClientProps {
  ingredientTags: TagData[];
  dishTags: TagData[];
  sweetsTags: TagData[];
  breadTags: TagData[];
  likedRecipes: Recipe[];
  savedRecipes: Recipe[];
  recentlyViewedRecipes: Recipe[];
}

export default function HomePageClient({
  ingredientTags,
  dishTags,
  sweetsTags,
  breadTags,
  likedRecipes,
  savedRecipes,
  recentlyViewedRecipes,
}: HomePageClientProps) {
  const router = useRouter();

  // モーダルダイアログの状態管理
  const [likeDialogOpen, setLikeDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<number | null>(null);
  const [updatingLikeRecipeId, setUpdatingLikeRecipeId] = useState<number | null>(null);
  const [updatingCommentRecipeId, setUpdatingCommentRecipeId] = useState<number | null>(null);

  // 最近見たレシピの横スクロール用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // スクロール位置をチェック
  const checkScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      // スクロール可能かどうかを判定（1pxの誤差を許容）
      const canScroll = scrollWidth > clientWidth;
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
      
      // デバッグ用（開発時のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log('Scroll check:', { scrollLeft, scrollWidth, clientWidth, canScroll, canScrollLeft: scrollLeft > 1, canScrollRight: canScroll && scrollLeft < scrollWidth - clientWidth - 1 });
      }
    }
  }, []);

  // スクロール位置のチェック（初期化時とリサイズ時）
  useEffect(() => {
    // DOMが完全にレンダリングされた後にチェック（requestAnimationFrameを使用）
    const checkAfterRender = () => {
      requestAnimationFrame(() => {
        checkScrollPosition();
      });
    };

    // 初回チェック
    const timer = setTimeout(checkAfterRender, 100);

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkAfterRender);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkAfterRender);
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [recentlyViewedRecipes, checkScrollPosition]);

  // 左にスクロール
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      scrollContainerRef.current.scrollBy({
        left: -cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 右にスクロール
  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      scrollContainerRef.current.scrollBy({
        left: cardWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleTagClick = (tag: TagData) => {
    if (tag.hasChildren === "▼") {
      // 子タグがある場合はタグ検索画面に遷移（ドリルダウン）
      router.push(`/recipes/tags?tag=${encodeURIComponent(tag.name)}`);
    } else {
      // 子タグがない場合はレシピ一覧画面に遷移
      router.push(`/recipes/list?tag=${encodeURIComponent(tag.name)}`);
    }
  };

  const handleMoreTagsClick = (tagName: string) => {
    router.push(`/recipes/tags?tag=${encodeURIComponent(tagName)}`);
  };

  const handleMoreLikesClick = () => {
    router.push("/recipes/likes");
  };

  const handleMoreSavedClick = () => {
    router.push("/recipes/folders");
  };

  const handleLikeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLikeDialogOpen(true);
  };

  const handleCommentClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCommentDialogOpen(true);
  };

  const handleFolderClick = async (recipe: Recipe) => {
    setSavingRecipeId(recipe.recipeId);
    try {
      if (recipe.isInFolder) {
        await removeRecipeFromFolder(recipe.recipeId);
      } else {
        await addRecipeToFolder(recipe.recipeId);
      }
      // ページをリロードして最新の状態を反映
      router.refresh();
    } catch (error) {
      console.error("フォルダー操作に失敗しました:", error);
      alert(error instanceof Error ? error.message : "フォルダー操作に失敗しました");
    } finally {
      setSavingRecipeId(null);
    }
  };

  const handleLikeSubmit = async (rank: number) => {
    if (!selectedRecipe) return;
    setUpdatingLikeRecipeId(selectedRecipe.recipeId);
    try {
      await updateRank(selectedRecipe.recipeId, rank);
      setLikeDialogOpen(false);
      // ページをリロードして最新の状態を反映
      router.refresh();
    } catch (error) {
      console.error("評価の更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "評価の更新に失敗しました");
    } finally {
      setUpdatingLikeRecipeId(null);
    }
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedRecipe) return;
    setUpdatingCommentRecipeId(selectedRecipe.recipeId);
    try {
      await updateComment(selectedRecipe.recipeId, comment);
      setCommentDialogOpen(false);
      // ページをリロードして最新の状態を反映
      router.refresh();
    } catch (error) {
      console.error("コメントの更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "コメントの更新に失敗しました");
    } finally {
      setUpdatingCommentRecipeId(null);
    }
  };


  return (
    <div className="p-4 pt-[30px] md:pt-[30px]">
      <h1 className="text-3xl font-bold mb-8">ホーム</h1>

      {/* 食材セクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">食材</h2>
          <button
            onClick={() => handleMoreTagsClick("素材別")}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {ingredientTags.map((tag) => (
            <TagCard key={tag.tagId} tag={tag} onClick={handleTagClick} />
          ))}
        </div>
      </section>

      {/* 料理セクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">料理</h2>
          <button
            onClick={() => handleMoreTagsClick("料理")}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {dishTags.map((tag) => (
            <TagCard key={tag.tagId} tag={tag} onClick={handleTagClick} />
          ))}
        </div>
      </section>

      {/* お菓子セクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">お菓子</h2>
          <button
            onClick={() => handleMoreTagsClick("お菓子")}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {sweetsTags.map((tag) => (
            <TagCard key={tag.tagId} tag={tag} onClick={handleTagClick} />
          ))}
        </div>
      </section>

      {/* パンセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">パン</h2>
          <button
            onClick={() => handleMoreTagsClick("パン")}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
          {breadTags.map((tag) => (
            <TagCard key={tag.tagId} tag={tag} onClick={handleTagClick} />
          ))}
        </div>
      </section>

      {/* 最近見たレシピセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">最近見たレシピ</h2>
        </div>
        {recentlyViewedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">まだ閲覧したレシピはありません</p>
        ) : (
          <div className="relative">
            {/* 左スクロールボタン */}
            {canScrollLeft && (
              <button
                onClick={scrollLeft}
                className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-2.5 md:p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="左にスクロール"
              >
                <ChevronLeft className="w-7 h-7 md:w-8 md:h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            
            {/* スクロール可能なコンテナ */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch', // iOSでのスムーズスクロール
                touchAction: 'pan-x pan-y' // 横スクロールと縦スクロールの両方を許可
              }}
            >
              {recentlyViewedRecipes.map((recipe) => (
                <div key={recipe.recipeId} className="flex-shrink-0 w-[200px]">
                  <RecipeCard
                    recipe={recipe}
                    onLikeClick={() => handleLikeClick(recipe)}
                    onCommentClick={() => handleCommentClick(recipe)}
                    onFolderClick={() => handleFolderClick(recipe)}
                    isSaving={savingRecipeId === recipe.recipeId}
                    isUpdatingLike={updatingLikeRecipeId === recipe.recipeId}
                    isUpdatingComment={updatingCommentRecipeId === recipe.recipeId}
                  />
                </div>
              ))}
            </div>

            {/* 右スクロールボタン */}
            {canScrollRight && (
              <button
                onClick={scrollRight}
                className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-2.5 md:p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="右にスクロール"
              >
                <ChevronRight className="w-7 h-7 md:w-8 md:h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* いいねしたレシピセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">いいねしたレシピ</h2>
          <button
            onClick={handleMoreLikesClick}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        {likedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">まだいいねされたレシピはありません</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {likedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onLikeClick={() => handleLikeClick(recipe)}
                onCommentClick={() => handleCommentClick(recipe)}
                onFolderClick={() => handleFolderClick(recipe)}
                isSaving={savingRecipeId === recipe.recipeId}
                isUpdatingLike={updatingLikeRecipeId === recipe.recipeId}
                isUpdatingComment={updatingCommentRecipeId === recipe.recipeId}
              />
            ))}
          </div>
        )}
      </section>

      {/* 保存したレシピセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">保存したレシピ</h2>
          <button
            onClick={handleMoreSavedClick}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            もっと見る
          </button>
        </div>
        {savedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">保存したレシピがありません</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {savedRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.recipeId}
                recipe={recipe}
                onLikeClick={() => handleLikeClick(recipe)}
                onCommentClick={() => handleCommentClick(recipe)}
                onFolderClick={() => handleFolderClick(recipe)}
                isSaving={savingRecipeId === recipe.recipeId}
                isUpdatingLike={updatingLikeRecipeId === recipe.recipeId}
                isUpdatingComment={updatingCommentRecipeId === recipe.recipeId}
              />
            ))}
          </div>
        )}
      </section>

      {/* モーダルダイアログ */}
      {selectedRecipe && (
        <>
          <LikeDialog
            isOpen={likeDialogOpen}
            onClose={() => setLikeDialogOpen(false)}
            onSubmit={handleLikeSubmit}
            currentRank={selectedRecipe.rank}
          />
          <CommentDialog
            isOpen={commentDialogOpen}
            onClose={() => setCommentDialogOpen(false)}
            onSubmit={handleCommentSubmit}
            recipeName={selectedRecipe.title}
            currentComment={selectedRecipe.comment || ""}
          />
        </>
      )}
    </div>
  );
}

