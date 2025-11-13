import { getRecipesByFolder } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";

export default async function FoldersPage() {
  try {
    const { recipes, hasMore } = await getRecipesByFolder(0, 12);

    return (
      <div className="p-4 pt-[30px] md:pt-[30px]">
        <h1 className="text-2xl font-bold mb-4">保存したレシピ</h1>
        {recipes.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">保存したレシピがありません</p>
          </div>
        ) : (
          <RecipeListWithLoadMore
            initialRecipes={recipes}
            initialHasMore={hasMore}
          />
        )}
      </div>
    );
  } catch (error) {
    console.error("レシピの読み込みに失敗しました:", error);
    return (
      <div className="p-4 pt-[30px] md:pt-[30px]">
        <h1 className="text-2xl font-bold mb-4">保存したレシピ</h1>
        <p className="text-red-500">レシピの読み込みに失敗しました</p>
      </div>
    );
  }
}
