import { getFilteredRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import LikeFilterMenu from "@/app/components/LikeFilterMenu";

interface LikesPageProps {
  searchParams: Promise<{
    rank?: string | string[] | null;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default async function LikesPage({
  searchParams,
}: LikesPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // ランクパラメータを取得（デフォルトは「めっちゃ好き」= "1"）
  const searchRank =
    Array.isArray(resolvedSearchParams?.rank)
      ? resolvedSearchParams.rank[0]
      : resolvedSearchParams?.rank || "1";

  // レシピを取得（いいねフィルターのみ使用、他のフィルターは使用しない）
  const { recipes: initialRecipes, hasMore: initialHasMore } =
    await getFilteredRecipes(
      0,
      ITEMS_PER_PAGE,
      "", // 検索文字列は使用しない
      "all", // 分類フィルターは使用しない
      "", // タグフィルターは使用しない
      searchRank as "all" | "1" | "2"
    );

  return (
    <div className="p-4 pt-[30px] md:pt-[30px]">
      {/* いいねフィルター */}
      <div className="mb-6 border border-gray-300 rounded-md p-2 bg-white shadow-md w-full md:w-1/3 mx-auto md:mx-0">
        <LikeFilterMenu />
      </div>
      
      {/* レシピ一覧 */}
      <RecipeListWithLoadMore
        key={searchRank}
        initialRecipes={initialRecipes}
        initialHasMore={initialHasMore}
        searchTerm=""
        searchMode="all"
        searchTag=""
        searchRank={searchRank}
      />
    </div>
  );
}

