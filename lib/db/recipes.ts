/**
 * レシピ検索・取得関連のデータベース関数
 */

import { sql } from '@vercel/postgres';
import type { RecipeListResult, SearchMode, RankFilter, SortOrder } from '@/lib/types/recipe';
import { getModeWhereClause, getRankWhereClause } from './helpers/query-builders';

/**
 * レシピ一覧を取得
 * @param userId ユーザーID
 * @param limit 取得件数
 * @param offset オフセット
 * @param mode 分類フィルタ
 * @param rank いいねフィルタ
 * @param sort ソート順
 * @returns レシピ一覧とhasMoreフラグ
 */
export async function getRecipes(
  userId: string,
  limit: number,
  offset: number,
  mode: SearchMode = 'all',
  rank: RankFilter = 'all',
  sort: SortOrder = 'desc'
): Promise<RecipeListResult> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const sortOrder = sort.toUpperCase();
  
  const query = `
    SELECT
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      r.is_main_dish as "isMainDish",
      r.is_sub_dish as "isSubDish",
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as "isInFolder"
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE 1=1 ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count ${sortOrder}, r.recipe_id DESC
    LIMIT $2 OFFSET $3;
  `;
  
  const { rows } = await sql.query(query, [userId, limit, offset]);
  const hasMore = rows.length === limit;
  
  return {
    recipes: rows.map(row => ({
      recipeId: row.recipeId,
      title: row.title,
      imageUrl: row.imageUrl,
      tsukurepoCount: row.tsukurepoCount,
      isMainDish: row.isMainDish,
      isSubDish: row.isSubDish,
      tag: row.tag,
      rank: row.rank,
      comment: row.comment,
      isInFolder: row.isInFolder,
    })),
    hasMore,
  };
}

/**
 * タイトルでレシピを検索
 * @param userId ユーザーID
 * @param searchTerm 検索文字列
 * @param limit 取得件数
 * @param offset オフセット
 * @param mode 分類フィルタ
 * @param rank いいねフィルタ
 * @param sort ソート順
 * @returns レシピ一覧とhasMoreフラグ
 */
export async function getRecipesByTitle(
  userId: string,
  searchTerm: string,
  limit: number,
  offset: number,
  mode: SearchMode = 'all',
  rank: RankFilter = 'all',
  sort: SortOrder = 'desc'
): Promise<RecipeListResult> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const sortOrder = sort.toUpperCase();
  const searchPattern = `%${searchTerm}%`;
  
  const query = `
    SELECT
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      r.is_main_dish as "isMainDish",
      r.is_sub_dish as "isSubDish",
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as "isInFolder"
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.title ILIKE $2 ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count ${sortOrder}, r.recipe_id DESC
    LIMIT $3 OFFSET $4;
  `;
  
  const { rows } = await sql.query(query, [userId, searchPattern, limit, offset]);
  const hasMore = rows.length === limit;
  
  return {
    recipes: rows.map(row => ({
      recipeId: row.recipeId,
      title: row.title,
      imageUrl: row.imageUrl,
      tsukurepoCount: row.tsukurepoCount,
      isMainDish: row.isMainDish,
      isSubDish: row.isSubDish,
      tag: row.tag,
      rank: row.rank,
      comment: row.comment,
      isInFolder: row.isInFolder,
    })),
    hasMore,
  };
}

/**
 * タグでレシピを検索
 * @param userId ユーザーID
 * @param tagName タグ名
 * @param limit 取得件数
 * @param offset オフセット
 * @param mode 分類フィルタ
 * @param rank いいねフィルタ
 * @param sort ソート順
 * @returns レシピ一覧とhasMoreフラグ
 */
export async function getRecipesByTag(
  userId: string,
  tagName: string,
  limit: number,
  offset: number,
  mode: SearchMode = 'all',
  rank: RankFilter = 'all',
  sort: SortOrder = 'desc'
): Promise<RecipeListResult> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const sortOrder = sort.toUpperCase();
  
  const query = `
    SELECT
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      r.is_main_dish as "isMainDish",
      r.is_sub_dish as "isSubDish",
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as "isInFolder"
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.tag IS NOT NULL 
      AND r.tag != '' 
      AND $2 = ANY(string_to_array(r.tag, ' '))
      ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count ${sortOrder}, r.recipe_id DESC
    LIMIT $3 OFFSET $4;
  `;
  
  const { rows } = await sql.query(query, [userId, tagName, limit, offset]);
  const hasMore = rows.length === limit;
  
  return {
    recipes: rows.map(row => ({
      recipeId: row.recipeId,
      title: row.title,
      imageUrl: row.imageUrl,
      tsukurepoCount: row.tsukurepoCount,
      isMainDish: row.isMainDish,
      isSubDish: row.isSubDish,
      tag: row.tag,
      rank: row.rank,
      comment: row.comment,
      isInFolder: row.isInFolder,
    })),
    hasMore,
  };
}

/**
 * フォルダー内のレシピを取得
 * @param userId ユーザーID
 * @param limit 取得件数
 * @param offset オフセット
 * @param mode 分類フィルタ
 * @param rank いいねフィルタ
 * @param sort ソート順
 * @returns レシピ一覧とhasMoreフラグ
 */
export async function getRecipesByFolder(
  userId: string,
  limit: number,
  offset: number,
  mode: SearchMode = 'all',
  rank: RankFilter = 'all',
  sort: SortOrder = 'desc'
): Promise<RecipeListResult> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const sortOrder = sort.toUpperCase();
  
  const query = `
    SELECT DISTINCT
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      r.is_main_dish as "isMainDish",
      r.is_sub_dish as "isSubDish",
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      true as "isInFolder"
    FROM reno_recipes r
    JOIN reno_user_folders uf ON uf.user_id = $1
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.recipe_id::text = ANY(string_to_array(COALESCE(uf.id_of_recipes, ''), ' '))
      ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count ${sortOrder}, r.recipe_id DESC
    LIMIT $2 OFFSET $3;
  `;
  
  const { rows } = await sql.query(query, [userId, limit, offset]);
  const hasMore = rows.length === limit;
  
  return {
    recipes: rows.map(row => ({
      recipeId: row.recipeId,
      title: row.title,
      imageUrl: row.imageUrl,
      tsukurepoCount: row.tsukurepoCount,
      isMainDish: row.isMainDish,
      isSubDish: row.isSubDish,
      tag: row.tag,
      rank: row.rank,
      comment: row.comment,
      isInFolder: row.isInFolder,
    })),
    hasMore,
  };
}

/**
 * レシピIDで検索
 * @param userId ユーザーID
 * @param recipeId レシピID
 * @returns レシピ一覧とhasMoreフラグ
 */
export async function getRecipeById(
  userId: string,
  recipeId: number
): Promise<RecipeListResult> {
  const query = `
    SELECT
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      r.is_main_dish as "isMainDish",
      r.is_sub_dish as "isSubDish",
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as "isInFolder"
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.recipe_id = $2;
  `;
  
  const { rows } = await sql.query(query, [userId, recipeId]);
  
  return {
    recipes: rows.map(row => ({
      recipeId: row.recipeId,
      title: row.title,
      imageUrl: row.imageUrl,
      tsukurepoCount: row.tsukurepoCount,
      isMainDish: row.isMainDish,
      isSubDish: row.isSubDish,
      tag: row.tag,
      rank: row.rank,
      comment: row.comment,
      isInFolder: row.isInFolder,
    })),
    hasMore: false,
  };
}

