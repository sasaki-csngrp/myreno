import { getTagsByLevel, getFilteredRecipes, getRecipesByFolder } from "@/lib/actions/recipes";
import type { Tag } from "@/lib/types/recipe";
import HomePageClient from "./HomePageClient";

// レシピ数が0件のタグをフィルタリングする関数（タグ検索画面と同様のロジック）
function filterTagsWithRecipes(tags: Tag[]) {
  return tags.filter((tag) => {
    // 子タグがある場合は表示
    if (tag.hasChildren === "▼") {
      return true;
    }
    // レシピ件数を抽出（"X 件"形式から数値を取得）
    const match = tag.hasChildren.match(/^(\d+)\s*件$/);
    if (match) {
      const recipeCount = parseInt(match[1], 10);
      return recipeCount > 0;
    }
    return false;
  });
}

export default async function HomePage() {
  // 食材（素材別）のタグを取得（レベル1、親タグ「素材別」）
  const ingredientTags = await getTagsByLevel(1, "素材別");
  const ingredientTagsFiltered = filterTagsWithRecipes(ingredientTags);
  const ingredientTagsDisplay = ingredientTagsFiltered.slice(0, 6).map(tag => ({
    ...tag,
    dispname: tag.dispname === "素材別" ? "食材" : tag.dispname,
  }));

  // 料理のタグを取得（レベル1、親タグ「料理」）
  const dishTags = await getTagsByLevel(1, "料理");
  const dishTagsFiltered = filterTagsWithRecipes(dishTags);
  const dishTagsDisplay = dishTagsFiltered.slice(0, 6);

  // お菓子のタグを取得（レベル1、親タグ「お菓子」）
  const sweetsTags = await getTagsByLevel(1, "お菓子");
  const sweetsTagsFiltered = filterTagsWithRecipes(sweetsTags);
  const sweetsTagsDisplay = sweetsTagsFiltered.slice(0, 6);

  // パンのタグを取得（レベル1、親タグ「パン」）
  const breadTags = await getTagsByLevel(1, "パン");
  const breadTagsFiltered = filterTagsWithRecipes(breadTags);
  const breadTagsDisplay = breadTagsFiltered.slice(0, 6);

  // いいねしたレシピを取得（rank=1、4件）
  const { recipes: likedRecipes } = await getFilteredRecipes(
    0,
    4,
    "",
    "all",
    "",
    "1"
  );

  // 保存したレシピを取得（4件）
  const { recipes: savedRecipes } = await getRecipesByFolder(0, 4);

  return (
    <HomePageClient
      ingredientTags={ingredientTagsDisplay}
      dishTags={dishTagsDisplay}
      sweetsTags={sweetsTagsDisplay}
      breadTags={breadTagsDisplay}
      likedRecipes={likedRecipes}
      savedRecipes={savedRecipes}
    />
  );
}
