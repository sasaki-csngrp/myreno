/**
 * 最近見たレシピ関連のデータベース関数
 */

import { sql } from '@vercel/postgres';

/**
 * レシピの閲覧履歴を記録（既に存在する場合は更新）
 * @param userId ユーザーID
 * @param recipeId レシピID
 */
export async function recordRecipeView(
  userId: string,
  recipeId: number
): Promise<void> {
  // 既存レコードの確認
  const { rows } = await sql`
    SELECT user_id, recipe_id
    FROM reno_user_recently_viewed
    WHERE user_id = ${userId} AND recipe_id = ${recipeId};
  `;
  
  if (rows.length > 0) {
    // 既に存在する場合は viewed_at を更新
    await sql`
      UPDATE reno_user_recently_viewed
      SET viewed_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND recipe_id = ${recipeId};
    `;
  } else {
    // 新規作成
    await sql`
      INSERT INTO reno_user_recently_viewed (user_id, recipe_id, viewed_at)
      VALUES (${userId}, ${recipeId}, CURRENT_TIMESTAMP);
    `;
  }

  // 50件を超えていたら古いものを削除
  await sql`
    DELETE FROM reno_user_recently_viewed
    WHERE user_id = ${userId}
    AND (user_id, recipe_id) NOT IN (
      SELECT user_id, recipe_id
      FROM reno_user_recently_viewed
      WHERE user_id = ${userId}
      ORDER BY viewed_at DESC
      LIMIT 50
    );
  `;
}

/**
 * 最近見たレシピ一覧を取得
 * @param userId ユーザーID
 * @param limit 取得件数（デフォルト: 12）
 * @returns レシピ一覧
 */
export async function getRecentlyViewedRecipes(
  userId: string,
  limit: number = 12
) {
  const query = `
    SELECT 
      r.recipe_id as "recipeId",
      r.title,
      r.image_url as "imageUrl",
      r.tsukurepo_count as "tsukurepoCount",
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as "isInFolder"
    FROM reno_user_recently_viewed rv
    INNER JOIN reno_recipes r ON rv.recipe_id = r.recipe_id
    LEFT JOIN reno_user_recipe_preferences urp 
      ON urp.user_id = $1 AND urp.recipe_id = r.recipe_id
    WHERE rv.user_id = $1
    ORDER BY rv.viewed_at DESC
    LIMIT $2;
  `;

  const { rows } = await sql.query(query, [userId, limit]);

  return rows.map((row) => ({
    recipeId: row.recipeId,
    title: row.title,
    imageUrl: row.imageUrl,
    tsukurepoCount: row.tsukurepoCount,
    rank: row.rank,
    comment: row.comment || null,
    isInFolder: row.isInFolder,
  }));
}

