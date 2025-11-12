import { getRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";

const ITEMS_PER_PAGE = 12;

export default async function RecipesPage() {
  const { recipes, hasMore } = await getRecipes(0, ITEMS_PER_PAGE);

  return (
    <div className="p-4 pt-[100px]">
      <RecipeListWithLoadMore
        initialRecipes={recipes}
        initialHasMore={hasMore}
      />
    </div>
  );
}
