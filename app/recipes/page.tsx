import { getTagsByLevel, getTagsByNames, getFilteredRecipes, getRecipesByFolder, getRecentlyViewedRecipes } from "@/lib/actions/recipes";
import type { Tag } from "@/lib/types/recipe";
import HomePageClient from "./HomePageClient";

// 固定で表示するタグのname（タグ名）リスト
// ログから、実際のnameは「素材別肉」（タブなし）の形式であることが判明
const FIXED_INGREDIENT_TAG_NAMES = [
  "素材別肉",
  "素材別魚介",
  "素材別野菜",
  "素材別大豆加工品",
  "素材別缶詰",
  "素材別卵",
];

const FIXED_DISH_TAG_NAMES = [
  "料理ご飯もの",
  "料理おかず",
  "料理汁もの",
  "料理パスタ",
  "料理麺もの",
  "料理鍋",
];

const FIXED_SWEETS_TAG_NAMES = [
  "お菓子クッキー",
  "お菓子ケーキ",
  "お菓子チョコレートのお菓子",
  "お菓子冷たいお菓子",
  "お菓子野菜を使ったお菓子",
  "お菓子果物を使ったお菓子",
];

const FIXED_BREAD_TAG_NAMES = [
  "パン手作りパン",
  "パン食パン",
  "パンサンドイッチ",
  "パンハンバーガー",
  "パンピザ",
  "パン肉まん",
];

export default async function HomePage() {
  // 全てのレベル1のタグを取得してから、JavaScriptでフィルタリング
  const allLevel1Tags = await getTagsByLevel(1, "");
  
  // レベル0のタグを取得して、親タグのnameを確認
  const level0Tags = await getTagsByLevel(0, "");
  const ingredientParentTag = level0Tags.find(t => t.dispname === "素材別" || t.name.includes("素材別"));
  const dishParentTag = level0Tags.find(t => t.dispname === "料理" || t.name.includes("料理"));
  const sweetsParentTag = level0Tags.find(t => t.dispname === "お菓子" || t.name.includes("お菓子"));
  const breadParentTag = level0Tags.find(t => t.dispname === "パン" || t.name.includes("パン"));

  console.log("=== デバッグ情報 ===");
  console.log("Level 0 tags:", level0Tags.map(t => ({ name: t.name, dispname: t.dispname })));
  console.log("All level 1 tags count:", allLevel1Tags.length);
  if (allLevel1Tags.length > 0) {
    console.log("First level 1 tag:", {
      name: allLevel1Tags[0].name,
      dispname: allLevel1Tags[0].dispname,
    });
  }

  // nameでマッチングして、指定された順序でタグを選択
  // ログから、実際のnameは「素材別肉」（タブなし）の形式であることが判明
  const allTagsMap = new Map(allLevel1Tags.map(tag => [tag.name, tag]));
  
  const ingredientTagsDisplay = FIXED_INGREDIENT_TAG_NAMES
    .map(tagName => {
      const tag = allTagsMap.get(tagName);
      if (!tag) {
        console.log(`Ingredient tag not found for name: "${tagName}"`);
      }
      return tag;
    })
    .filter((tag): tag is Tag => tag !== undefined)
    .map(tag => ({
      ...tag,
      dispname: tag.dispname === "素材別" ? "食材" : tag.dispname,
    }));

  const dishTagsDisplay = FIXED_DISH_TAG_NAMES
    .map(tagName => {
      const tag = allTagsMap.get(tagName);
      if (!tag) {
        console.log(`Dish tag not found for name: "${tagName}"`);
      }
      return tag;
    })
    .filter((tag): tag is Tag => tag !== undefined);

  const sweetsTagsDisplay = FIXED_SWEETS_TAG_NAMES
    .map(tagName => {
      const tag = allTagsMap.get(tagName);
      if (!tag) {
        console.log(`Sweets tag not found for name: "${tagName}"`);
      }
      return tag;
    })
    .filter((tag): tag is Tag => tag !== undefined);

  const breadTagsDisplay = FIXED_BREAD_TAG_NAMES
    .map(tagName => {
      const tag = allTagsMap.get(tagName);
      if (!tag) {
        console.log(`Bread tag not found for name: "${tagName}"`);
      }
      return tag;
    })
    .filter((tag): tag is Tag => tag !== undefined);

  console.log("Final counts:", {
    ingredient: ingredientTagsDisplay.length,
    dish: dishTagsDisplay.length,
    sweets: sweetsTagsDisplay.length,
    bread: breadTagsDisplay.length,
  });

  // いいねしたレシピを取得（rank=1、12件）
  const { recipes: likedRecipes, hasMore: likedRecipesHasMore } = await getFilteredRecipes(
    0,
    12,
    "",
    "all",
    "",
    "1"
  );

  // 保存したレシピを取得（12件）
  const { recipes: savedRecipes, hasMore: savedRecipesHasMore } = await getRecipesByFolder(0, 12);

  // 最近見たレシピを取得（12件）
  const recentlyViewedRecipes = await getRecentlyViewedRecipes(12);

  return (
    <HomePageClient
      ingredientTags={ingredientTagsDisplay}
      dishTags={dishTagsDisplay}
      sweetsTags={sweetsTagsDisplay}
      breadTags={breadTagsDisplay}
      likedRecipes={likedRecipes}
      likedRecipesHasMore={likedRecipesHasMore}
      savedRecipes={savedRecipes}
      savedRecipesHasMore={savedRecipesHasMore}
      recentlyViewedRecipes={recentlyViewedRecipes}
    />
  );
}
