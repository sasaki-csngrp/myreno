"use client";

import { useRouter } from "next/navigation";
import TagCard, { TagData } from "@/app/components/TagCard";
import RecipeCard from "@/app/components/RecipeCard";
import LikeDialog from "@/app/components/LikeDialog";
import CommentDialog from "@/app/components/CommentDialog";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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
  likedRecipesHasMore: boolean;
  savedRecipes: Recipe[];
  savedRecipesHasMore: boolean;
  recentlyViewedRecipes: Recipe[];
}

export default function HomePageClient({
  ingredientTags,
  dishTags,
  sweetsTags,
  breadTags,
  likedRecipes,
  likedRecipesHasMore,
  savedRecipes,
  savedRecipesHasMore,
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
  const recentlyViewedScrollContainerRef = useRef<HTMLDivElement>(null);
  const [recentlyViewedCanScrollLeft, setRecentlyViewedCanScrollLeft] = useState(false);
  const [recentlyViewedCanScrollRight, setRecentlyViewedCanScrollRight] = useState(false);

  // いいねしたレシピの横スクロール用
  const likedRecipesScrollContainerRef = useRef<HTMLDivElement>(null);
  const [likedRecipesCanScrollLeft, setLikedRecipesCanScrollLeft] = useState(false);
  const [likedRecipesCanScrollRight, setLikedRecipesCanScrollRight] = useState(false);

  // 保存したレシピの横スクロール用
  const savedRecipesScrollContainerRef = useRef<HTMLDivElement>(null);
  const [savedRecipesCanScrollLeft, setSavedRecipesCanScrollLeft] = useState(false);
  const [savedRecipesCanScrollRight, setSavedRecipesCanScrollRight] = useState(false);

  // スクロール位置をチェック（最近見たレシピ）
  const checkRecentlyViewedScrollPosition = useCallback(() => {
    if (recentlyViewedScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = recentlyViewedScrollContainerRef.current;
      const canScroll = scrollWidth > clientWidth;
      setRecentlyViewedCanScrollLeft(scrollLeft > 1);
      setRecentlyViewedCanScrollRight(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // スクロール位置をチェック（いいねしたレシピ）
  const checkLikedRecipesScrollPosition = useCallback(() => {
    if (likedRecipesScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = likedRecipesScrollContainerRef.current;
      const canScroll = scrollWidth > clientWidth;
      setLikedRecipesCanScrollLeft(scrollLeft > 1);
      setLikedRecipesCanScrollRight(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // スクロール位置をチェック（保存したレシピ）
  const checkSavedRecipesScrollPosition = useCallback(() => {
    if (savedRecipesScrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = savedRecipesScrollContainerRef.current;
      const canScroll = scrollWidth > clientWidth;
      setSavedRecipesCanScrollLeft(scrollLeft > 1);
      setSavedRecipesCanScrollRight(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  // スクロール位置のチェック（最近見たレシピ）
  useEffect(() => {
    const checkAfterRender = () => {
      requestAnimationFrame(() => {
        checkRecentlyViewedScrollPosition();
      });
    };

    const timer = setTimeout(checkAfterRender, 100);

    const container = recentlyViewedScrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkRecentlyViewedScrollPosition);
      window.addEventListener('resize', checkAfterRender);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkRecentlyViewedScrollPosition);
        window.removeEventListener('resize', checkAfterRender);
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [recentlyViewedRecipes, checkRecentlyViewedScrollPosition]);

  // スクロール位置のチェック（いいねしたレシピ）
  useEffect(() => {
    const checkAfterRender = () => {
      requestAnimationFrame(() => {
        checkLikedRecipesScrollPosition();
      });
    };

    const timer = setTimeout(checkAfterRender, 100);

    const container = likedRecipesScrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkLikedRecipesScrollPosition);
      window.addEventListener('resize', checkAfterRender);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkLikedRecipesScrollPosition);
        window.removeEventListener('resize', checkAfterRender);
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [likedRecipes, checkLikedRecipesScrollPosition]);

  // スクロール位置のチェック（保存したレシピ）
  useEffect(() => {
    const checkAfterRender = () => {
      requestAnimationFrame(() => {
        checkSavedRecipesScrollPosition();
      });
    };

    const timer = setTimeout(checkAfterRender, 100);

    const container = savedRecipesScrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkSavedRecipesScrollPosition);
      window.addEventListener('resize', checkAfterRender);
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', checkSavedRecipesScrollPosition);
        window.removeEventListener('resize', checkAfterRender);
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, [savedRecipes, checkSavedRecipesScrollPosition]);

  // 左にスクロール（最近見たレシピ）
  const scrollRecentlyViewedLeft = () => {
    if (recentlyViewedScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      recentlyViewedScrollContainerRef.current.scrollBy({
        left: -cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 右にスクロール（最近見たレシピ）
  const scrollRecentlyViewedRight = () => {
    if (recentlyViewedScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      recentlyViewedScrollContainerRef.current.scrollBy({
        left: cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 左にスクロール（いいねしたレシピ）
  const scrollLikedRecipesLeft = () => {
    if (likedRecipesScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      likedRecipesScrollContainerRef.current.scrollBy({
        left: -cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 右にスクロール（いいねしたレシピ）
  const scrollLikedRecipesRight = () => {
    if (likedRecipesScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      likedRecipesScrollContainerRef.current.scrollBy({
        left: cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 左にスクロール（保存したレシピ）
  const scrollSavedRecipesLeft = () => {
    if (savedRecipesScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      savedRecipesScrollContainerRef.current.scrollBy({
        left: -cardWidth,
        behavior: 'smooth',
      });
    }
  };

  // 右にスクロール（保存したレシピ）
  const scrollSavedRecipesRight = () => {
    if (savedRecipesScrollContainerRef.current) {
      const cardWidth = 240; // カード幅 + gap
      savedRecipesScrollContainerRef.current.scrollBy({
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
          {/* スマホでは→アイコンを表示、PCでは非表示 */}
          <div className="md:hidden">
            <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        {recentlyViewedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">まだ閲覧したレシピはありません</p>
        ) : (
          <div className="relative">
            {/* 左スクロールボタン（PCのみ表示） */}
            {recentlyViewedCanScrollLeft && (
              <button
                onClick={scrollRecentlyViewedLeft}
                className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="左にスクロール"
              >
                <ChevronLeft className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            
            {/* スクロール可能なコンテナ */}
            <div
              ref={recentlyViewedScrollContainerRef}
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

            {/* 右スクロールボタン（PCのみ表示） */}
            {recentlyViewedCanScrollRight && (
              <button
                onClick={scrollRecentlyViewedRight}
                className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="右にスクロール"
              >
                <ChevronRight className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* いいねしたレシピセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">いいねしたレシピ</h2>
          {/* スマホでは→アイコンを表示、PCでは非表示 */}
          <div className="md:hidden">
            <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        {likedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">まだいいねされたレシピはありません</p>
        ) : (
          <div className="relative">
            {/* 左スクロールボタン（PCのみ表示） */}
            {likedRecipesCanScrollLeft && (
              <button
                onClick={scrollLikedRecipesLeft}
                className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="左にスクロール"
              >
                <ChevronLeft className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            
            {/* スクロール可能なコンテナ */}
            <div
              ref={likedRecipesScrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch', // iOSでのスムーズスクロール
                touchAction: 'pan-x pan-y' // 横スクロールと縦スクロールの両方を許可
              }}
            >
              {likedRecipes.map((recipe) => (
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
              {/* もっと見るボタン（12件以上ある場合） */}
              {likedRecipesHasMore && (
                <div className="flex-shrink-0 w-[200px] flex items-center justify-center">
                  <button
                    onClick={handleMoreLikesClick}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <ArrowRight className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">もっと見る</span>
                  </button>
                </div>
              )}
            </div>

            {/* 右スクロールボタン（PCのみ表示） */}
            {likedRecipesCanScrollRight && (
              <button
                onClick={scrollLikedRecipesRight}
                className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="右にスクロール"
              >
                <ChevronRight className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* 保存したレシピセクション */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">保存したレシピ</h2>
          {/* スマホでは→アイコンを表示、PCでは非表示 */}
          <div className="md:hidden">
            <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
        </div>
        {savedRecipes.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">保存したレシピがありません</p>
        ) : (
          <div className="relative">
            {/* 左スクロールボタン（PCのみ表示） */}
            {savedRecipesCanScrollLeft && (
              <button
                onClick={scrollSavedRecipesLeft}
                className="hidden md:block absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="左にスクロール"
              >
                <ChevronLeft className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
            
            {/* スクロール可能なコンテナ */}
            <div
              ref={savedRecipesScrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch', // iOSでのスムーズスクロール
                touchAction: 'pan-x pan-y' // 横スクロールと縦スクロールの両方を許可
              }}
            >
              {savedRecipes.map((recipe) => (
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
              {/* もっと見るボタン（12件以上ある場合） */}
              {savedRecipesHasMore && (
                <div className="flex-shrink-0 w-[200px] flex items-center justify-center">
                  <button
                    onClick={handleMoreSavedClick}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <ArrowRight className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">もっと見る</span>
                  </button>
                </div>
              )}
            </div>

            {/* 右スクロールボタン（PCのみ表示） */}
            {savedRecipesCanScrollRight && (
              <button
                onClick={scrollSavedRecipesRight}
                className="hidden md:block absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-zinc-900 rounded-full p-3 shadow-lg active:bg-gray-100 dark:active:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors border border-gray-200 dark:border-zinc-700"
                aria-label="右にスクロール"
              >
                <ChevronRight className="w-8 h-8 text-gray-700 dark:text-gray-300" />
              </button>
            )}
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

