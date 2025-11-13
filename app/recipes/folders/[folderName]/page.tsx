import { getRecipesByFolder } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import { notFound } from "next/navigation";

interface FolderRecipesPageProps {
  params: Promise<{
    folderName: string;
  }>;
}

export default async function FolderRecipesPage({
  params,
}: FolderRecipesPageProps) {
  const resolvedParams = await params;
  const folderName = decodeURIComponent(resolvedParams.folderName);

  try {
    const { recipes, hasMore } = await getRecipesByFolder(folderName, 0, 12);

    return (
      <div className="p-4 pt-[100px] md:pt-[130px]">
        <h1 className="text-2xl font-bold mb-4">保存場所: {folderName}</h1>
        {recipes.length === 0 ? (
          <p className="text-gray-500">この保存場所にはレシピがありません</p>
        ) : (
          <RecipeListWithLoadMore
            initialRecipes={recipes}
            initialHasMore={hasMore}
            folderName={folderName}
          />
        )}
      </div>
    );
  } catch (error) {
    // フォルダーが見つからない場合は404を返す
    if (error instanceof Error && error.message === "フォルダーが見つかりません") {
      notFound();
    }
    throw error;
  }
}

