/**
 * レシピ関連の型定義
 * Prismaから独立した型定義（@vercel/postgres移行用）
 */

/**
 * レシピデータ型
 */
export type Recipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  tsukurepoCount: number;
  isMainDish: boolean;
  isSubDish: boolean;
  tag: string | null;
  rank: number; // 0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない
  comment: string | null;
  isInFolder: boolean;
};

/**
 * レシピ一覧取得結果型
 */
export type RecipeListResult = {
  recipes: Recipe[];
  hasMore: boolean;
};

/**
 * 検索モード型
 */
export type SearchMode = 'all' | 'main_dish' | 'sub_dish' | 'others';

/**
 * いいねフィルタ型
 */
export type RankFilter = 'all' | '1' | '2';

/**
 * ソート順型
 */
export type SortOrder = 'asc' | 'desc';

/**
 * タグ情報型
 */
export type Tag = {
  tagId: number;
  dispname: string;
  name: string;
  imageUri: string | null;
  hasImageUri: boolean;
  hasChildren: string; // "▼" または "X 件" 形式
};

/**
 * フォルダー情報型
 */
export type Folder = {
  foldername: string;
  isInFolder: boolean;
};

/**
 * サムネイル画像付きフォルダー情報型
 */
export type FolderWithImages = {
  foldername: string;
  images: string[];
};

/**
 * レシピ取得パラメータ型
 */
export type GetRecipesParams = {
  userId: string;
  limit: number;
  offset: number;
  mode?: SearchMode;
  rank?: RankFilter;
  sort?: SortOrder;
};

/**
 * レシピ検索パラメータ型
 */
export type SearchRecipesParams = GetRecipesParams & {
  searchTerm?: string;
  searchTag?: string;
  folderName?: string;
};

