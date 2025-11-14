"use client";

import { useRouter } from "next/navigation";
import TagCard, { TagData } from "@/app/components/TagCard";
import RecipeCard from "@/app/components/RecipeCard";
import LikeDialog from "@/app/components/LikeDialog";
import CommentDialog from "@/app/components/CommentDialog";
import FolderDialog from "@/app/components/FolderDialog";
import { useState } from "react";
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
}

export default function HomePageClient({
  ingredientTags,
  dishTags,
  sweetsTags,
  breadTags,
  likedRecipes,
  savedRecipes,
}: HomePageClientProps) {
  const router = useRouter();

  // モーダルダイアログの状態管理
  const [likeDialogOpen, setLikeDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

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

  const handleFolderClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFolderDialogOpen(true);
  };

  const handleLikeSubmit = async (rank: number) => {
    if (!selectedRecipe) return;
    await updateRank(selectedRecipe.recipeId, rank);
    setLikeDialogOpen(false);
    // ページをリロードして最新の状態を反映
    router.refresh();
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedRecipe) return;
    await updateComment(selectedRecipe.recipeId, comment);
    setCommentDialogOpen(false);
    // ページをリロードして最新の状態を反映
    router.refresh();
  };

  const handleFolderChange = async () => {
    // ページをリロードして最新の状態を反映
    router.refresh();
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
          <FolderDialog
            isOpen={folderDialogOpen}
            onOpenChange={setFolderDialogOpen}
            recipe={{
              recipeId: selectedRecipe.recipeId,
              title: selectedRecipe.title,
              imageUrl: selectedRecipe.imageUrl,
              isInFolder: selectedRecipe.isInFolder,
            }}
            onFolderChange={handleFolderChange}
          />
        </>
      )}
    </div>
  );
}

