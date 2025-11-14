import { getFilteredRecipes, getTagByName, getTagNameByHierarchy, getTagsByLevel } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import RecipeFilterControls from "@/app/components/RecipeFilterControls";
import Breadcrumb from "@/app/components/Breadcrumb";
import { TagData } from "@/app/components/TagCard";
import { searchModes } from "@/lib/constants";

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

  // タグが「素材別」（食材）の場合のみフィルターコントロールを表示
  // タグ情報を取得して、親タグ（大タグ）が「素材別」かどうかを判定
  let shouldShowFilterControls = false;
  let pathTags: TagData[] = [];
  
  if (searchTag) {
    const tagInfo = await getTagByName(searchTag);
    if (tagInfo && tagInfo.l === "素材別") {
      shouldShowFilterControls = true;
    }
    
    // パンくずリスト用のタグ情報を取得
    if (tagInfo) {
      const path: string[] = [];
      
      // レベル0（大タグ）のnameを取得
      if (tagInfo.l) {
        const lName = await getTagNameByHierarchy(0, tagInfo.l);
        if (lName) {
          path.push(lName);
        }
      }
      
      // レベル1（中タグ）のnameを取得
      if (tagInfo.level >= 1 && tagInfo.m) {
        const mName = await getTagNameByHierarchy(1, tagInfo.l, tagInfo.m);
        if (mName) {
          path.push(mName);
        }
      }
      
      // レベル2（小タグ）のnameを取得
      if (tagInfo.level >= 2 && tagInfo.s) {
        const sName = await getTagNameByHierarchy(2, tagInfo.l, tagInfo.m, tagInfo.s);
        if (sName) {
          path.push(sName);
        }
      }
      
      // レベル3（極小タグ）のnameを取得
      if (tagInfo.level >= 3 && tagInfo.ss) {
        const ssName = await getTagNameByHierarchy(3, tagInfo.l, tagInfo.m, tagInfo.s, tagInfo.ss);
        if (ssName) {
          path.push(ssName);
        }
      }
      
      // クリックしたタグ自体をパスに追加（既にパスに含まれている場合は追加しない）
      if (path.length === 0 || path[path.length - 1] !== searchTag) {
        path.push(searchTag);
      }
      
      // 各階層のタグ情報を取得
      for (let i = 0; i < path.length; i++) {
        const level = i;
        const parentTagName = i > 0 ? path[i - 1] : "";
        const levelTags = await getTagsByLevel(level, parentTagName);
        const tag = levelTags.find((t) => t.name === path[i]);
        if (tag) {
          pathTags.push(tag);
        }
      }
    }
  }

  // 分類名を取得
  const modeLabel = searchModes.find(m => m.mode === searchMode)?.label || "すべて";

  return (
    <>
      {shouldShowFilterControls && <RecipeFilterControls />}
      <div className={`p-4 ${shouldShowFilterControls ? "pt-[100px] md:pt-[130px]" : "pt-[30px] md:pt-[30px]"}`}>
        {/* パンくずリスト（タグが指定されている場合のみ表示） */}
        {pathTags.length > 0 && (
          <Breadcrumb pathTags={pathTags} />
        )}
        {shouldShowFilterControls && initialRecipes.length === 0 && searchMode !== "all" ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              この食材には{modeLabel}が登録されていません。
            </p>
          </div>
        ) : (
          <RecipeListWithLoadMore
            key={`${searchTerm}-${searchMode}-${searchTag}-${searchRank}`}
            initialRecipes={initialRecipes}
            initialHasMore={initialHasMore}
            searchTerm={searchTerm}
            searchMode={searchMode}
            searchTag={searchTag}
            searchRank={searchRank}
          />
        )}
      </div>
    </>
  );
}
