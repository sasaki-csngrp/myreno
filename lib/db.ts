/**
 * データベースアクセス関数（@vercel/postgres使用）
 * Prismaから独立した直接SQLクエリ実装
 */

import { sql } from '@vercel/postgres';
import type { Recipe, RecipeListResult, SearchMode, RankFilter, SortOrder, Tag, Folder, FolderWithImages } from '@/lib/types/recipe';

// ヘルパー関数: 分類フィルタのWHERE句を生成
function getModeWhereClause(mode: SearchMode): string {
  switch (mode) {
    case 'main_dish':
      return 'AND r.is_main_dish = true';
    case 'sub_dish':
      return 'AND r.is_sub_dish = true';
    case 'others':
      return 'AND (r.is_main_dish = false AND r.is_sub_dish = false)';
    default:
      return '';
  }
}

// ヘルパー関数: いいねフィルタのWHERE句を生成
function getRankWhereClause(rank: RankFilter): string {
  switch (rank) {
    case '1':
      return 'AND COALESCE(urp.rank, 0) = 1';
    case '2':
      return 'AND COALESCE(urp.rank, 0) = 2';
    case 'all':
    default:
      return '';
  }
}

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

/**
 * いいね状態を更新
 * @param userId ユーザーID
 * @param recipeId レシピID
 * @param rank いいね状態（0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない）
 */
export async function updateRank(
  userId: string,
  recipeId: number,
  rank: number
): Promise<void> {
  // 既存レコードの確認
  const { rows } = await sql`
    SELECT user_id, recipe_id
    FROM reno_user_recipe_preferences
    WHERE user_id = ${userId} AND recipe_id = ${recipeId};
  `;
  
  if (rows.length > 0) {
    // 更新
    await sql`
      UPDATE reno_user_recipe_preferences
      SET rank = ${rank}
      WHERE user_id = ${userId} AND recipe_id = ${recipeId};
    `;
  } else {
    // 新規作成
    await sql`
      INSERT INTO reno_user_recipe_preferences (user_id, recipe_id, rank, comment)
      VALUES (${userId}, ${recipeId}, ${rank}, NULL);
    `;
  }
}

/**
 * コメントを更新
 * @param userId ユーザーID
 * @param recipeId レシピID
 * @param comment コメント（空文字列の場合は削除）
 */
export async function updateComment(
  userId: string,
  recipeId: number,
  comment: string
): Promise<void> {
  const trimmedComment = comment.trim() || null;
  
  // 既存レコードの確認
  const { rows } = await sql`
    SELECT user_id, recipe_id
    FROM reno_user_recipe_preferences
    WHERE user_id = ${userId} AND recipe_id = ${recipeId};
  `;
  
  if (rows.length > 0) {
    // 更新
    await sql`
      UPDATE reno_user_recipe_preferences
      SET comment = ${trimmedComment}
      WHERE user_id = ${userId} AND recipe_id = ${recipeId};
    `;
  } else {
    // 新規作成
    await sql`
      INSERT INTO reno_user_recipe_preferences (user_id, recipe_id, rank, comment)
      VALUES (${userId}, ${recipeId}, 0, ${trimmedComment});
    `;
  }
}

/**
 * レベル別タグを取得
 * @param level タグのレベル（0: 大タグ, 1: 中タグ, 2: 小タグ, 3: 極小タグ）
 * @param parentTagName 親タグ名（階層ナビゲーション用、空文字列の場合は大タグを取得）
 * @returns タグ一覧
 */
export async function getTagsByLevel(
  level: number,
  parentTagName: string = ""
): Promise<Tag[]> {
  let query: string;
  let params: (string | number)[];
  
  // 子タグ数の条件
  let childTagCondition: string;
  if (level === 0) {
    childTagCondition = `tag.l = t.l`;
  } else if (level === 1) {
    childTagCondition = `tag.l || tag.m = t.l || t.m`;
  } else if (level === 2) {
    childTagCondition = `tag.l || tag.m || tag.s = t.l || t.m || t.s`;
  } else {
    childTagCondition = `tag.l || tag.m || tag.s || tag.ss = t.l || t.m || t.s || t.ss`;
  }
  
  query = `
    SELECT
      t.tag_id as "tagId",
      t.dispname,
      t.name,
      (SELECT image_url FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' AND tag LIKE '%' || t.name || '%' 
       ORDER BY tsukurepo_count DESC, recipe_id DESC LIMIT 1) AS "imageUri",
      (SELECT COUNT(*) FROM reno_tag_master tag
       WHERE tag.level = t.level + 1 AND ${childTagCondition}) AS "childTagCount",
      (SELECT COUNT(*) FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' 
         AND t.name = ANY(string_to_array(tag, ' '))) AS "recipeCount"
    FROM reno_tag_master t
    WHERE t.level = $1
  `;
  
  if (parentTagName === "") {
    query += ` ORDER BY t.tag_id;`;
    params = [level];
  } else {
    // 親タグによるフィルタリング
    if (level === 1) {
      query += ` AND t.l = $2 ORDER BY t.tag_id;`;
    } else if (level === 2) {
      query += ` AND t.l || t.m = $2 ORDER BY t.tag_id;`;
    } else if (level === 3) {
      query += ` AND t.l || t.m || t.s = $2 ORDER BY t.tag_id;`;
    } else {
      query += ` AND t.l = $2 ORDER BY t.tag_id;`;
    }
    params = [level, parentTagName];
  }
  
  const { rows } = await sql.query(query, params);
  
  return rows.map(row => {
    const childTagCount = parseInt(row.childTagCount, 10);
    const recipeCount = parseInt(row.recipeCount, 10);
    const imageUri = row.imageUri;
    
    let hasChildren: string;
    if (childTagCount > 0) {
      hasChildren = "▼";
    } else {
      hasChildren = `${recipeCount} 件`;
    }
    
    return {
      tagId: row.tagId,
      dispname: row.dispname || "",
      name: row.name || "",
      imageUri: imageUri || null,
      hasImageUri: imageUri ? true : false,
      hasChildren,
    };
  });
}

/**
 * タグ名に一致するレシピ数を取得
 * @param tagName タグ名
 * @returns レシピ数
 */
export async function getRecipeCountByTag(tagName: string): Promise<number> {
  const { rows } = await sql`
    SELECT COUNT(*) as count
    FROM reno_recipes
    WHERE tag IS NOT NULL 
      AND tag != '' 
      AND ${tagName} = ANY(string_to_array(tag, ' '));
  `;
  
  return parseInt(rows[0]?.count || '0', 10);
}

/**
 * ユーザーのフォルダーにレシピが登録されているか確認
 * @param userId ユーザーID
 * @param recipeId レシピID
 * @returns レシピがフォルダーに登録されているかどうか
 */
export async function isRecipeInFolder(
  userId: string,
  recipeId: number
): Promise<boolean> {
  const { rows } = await sql`
    SELECT id_of_recipes
    FROM reno_user_folders
    WHERE user_id = ${userId};
  `;
  
  if (rows.length === 0) {
    return false;
  }
  
  const existingIds = rows[0].id_of_recipes 
    ? rows[0].id_of_recipes.split(" ").filter((id: string) => id.trim() !== "")
    : [];
  
  return existingIds.includes(recipeId.toString());
}


/**
 * レシピをフォルダーに追加（レコードが無ければ作成）
 * @param userId ユーザーID
 * @param recipeId レシピID
 */
export async function addRecipeToFolder(
  userId: string,
  recipeId: number
): Promise<void> {
  // 既存のレコードを取得
  const { rows } = await sql`
    SELECT id_of_recipes
    FROM reno_user_folders
    WHERE user_id = ${userId};
  `;
  
  if (rows.length === 0) {
    // レコードが無ければ作成
    await sql`
      INSERT INTO reno_user_folders (user_id, id_of_recipes)
      VALUES (${userId}, ${recipeId.toString()});
    `;
    return;
  }
  
  // 既存のレシピIDリストを取得
  const existingIds = rows[0].id_of_recipes 
    ? rows[0].id_of_recipes.split(" ").filter((id: string) => id.trim() !== "")
    : [];
  
  if (existingIds.includes(recipeId.toString())) {
    return; // 既に登録されている
  }
  
  const newIds = [...existingIds, recipeId.toString()];
  const newIdOfRecipes = newIds.join(" ");
  
  await sql`
    UPDATE reno_user_folders
    SET id_of_recipes = ${newIdOfRecipes}
    WHERE user_id = ${userId};
  `;
}

/**
 * レシピをフォルダーから削除
 * @param userId ユーザーID
 * @param recipeId レシピID
 */
export async function removeRecipeFromFolder(
  userId: string,
  recipeId: number
): Promise<void> {
  // 既存のレシピIDリストを取得
  const { rows } = await sql`
    SELECT id_of_recipes
    FROM reno_user_folders
    WHERE user_id = ${userId};
  `;
  
  if (rows.length === 0) {
    return; // フォルダーが存在しない場合は何もしない
  }
  
  const existingIds = rows[0].id_of_recipes 
    ? rows[0].id_of_recipes.split(" ").filter((id: string) => id.trim() !== "")
    : [];
  
  const newIds = existingIds.filter((id: string) => id !== recipeId.toString());
  const newIdOfRecipes = newIds.join(" ");
  
  await sql`
    UPDATE reno_user_folders
    SET id_of_recipes = ${newIdOfRecipes}
    WHERE user_id = ${userId};
  `;
}


