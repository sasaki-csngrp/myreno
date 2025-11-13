import { getFilteredRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import RecipeFilterControls from "@/app/components/RecipeFilterControls";

interface RecipesPageProps {
  searchParams: Promise<{
    title?: string | string[] | null;
    mode?: string | string[] | null;
    tag?: string | string[] | null;
    folder?: string | string[] | null;
    rank?: string | string[] | null;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default async function RecipesPage({
  searchParams,
}: RecipesPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // 検索パラメータを取得
  const searchTerm =
    Array.isArray(resolvedSearchParams?.title)
      ? resolvedSearchParams.title[0]
      : resolvedSearchParams?.title || "";

  // レシピID検索かどうかを判定
  const isIdSearch = /^[0-9]+$/.test(searchTerm);

  // レシピID検索の場合は他の検索条件を無視
  const searchMode = isIdSearch
    ? "all"
    : Array.isArray(resolvedSearchParams?.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams?.mode || "all";
  
  const searchTag = isIdSearch
    ? ""
    : Array.isArray(resolvedSearchParams?.tag)
    ? resolvedSearchParams.tag[0]
    : resolvedSearchParams?.tag || "";
  
  const searchRank = isIdSearch
    ? "all"
    : Array.isArray(resolvedSearchParams?.rank)
    ? resolvedSearchParams.rank[0]
    : resolvedSearchParams?.rank || "all";

  // レシピを取得（DB層でフィルタリング）
  const { recipes: initialRecipes, hasMore: initialHasMore } =
    await getFilteredRecipes(
      0,
      ITEMS_PER_PAGE,
      searchTerm,
      searchMode as "all" | "main_dish" | "sub_dish" | "others",
      searchTag,
      searchRank as "all" | "1" | "2"
    );

  return (
    <>
      <RecipeFilterControls />
      <div className="p-4 pt-[100px] md:pt-[130px]">
        <RecipeListWithLoadMore
          key={`${searchTerm}-${searchMode}-${searchTag}-${searchRank}`}
          initialRecipes={initialRecipes}
          initialHasMore={initialHasMore}
          searchTerm={searchTerm}
          searchMode={searchMode}
          searchTag={searchTag}
          searchRank={searchRank}
        />
      </div>
    </>
  );
}
