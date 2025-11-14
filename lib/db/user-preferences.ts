/**
 * ユーザー設定（ランク・コメント）関連のデータベース関数
 */

import { sql } from '@vercel/postgres';

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

