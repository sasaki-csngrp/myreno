import { getFilteredRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import SearchInput from "@/app/components/SearchInput";

interface SearchPageProps {
  searchParams: Promise<{
    title?: string | string[] | null;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // 検索パラメータを取得
  const searchTerm =
    Array.isArray(resolvedSearchParams?.title)
      ? resolvedSearchParams.title[0]
      : resolvedSearchParams?.title || "";

  // レシピを取得（タイトル検索のみ、他のフィルターは使用しない）
  const { recipes: initialRecipes, hasMore: initialHasMore } =
    await getFilteredRecipes(
      0,
      ITEMS_PER_PAGE,
      searchTerm,
      "all", // 分類フィルターは使用しない
      "", // タグフィルターは使用しない
      "all" // ランクフィルターは使用しない
    );

  return (
    <div>
      {/* 検索入力（固定） */}
      <div className="fixed inset-x-0 top-[137px] md:top-16 z-40">
        <SearchInput />
      </div>
      
      {/* レシピ一覧（スクロール可能） */}
      <div className="pt-[110px] md:pt-[110px] p-4">
        <RecipeListWithLoadMore
          key={searchTerm}
          initialRecipes={initialRecipes}
          initialHasMore={initialHasMore}
          searchTerm={searchTerm}
          searchMode="all"
          searchTag=""
          searchRank="all"
        />
      </div>
    </div>
  );
}

