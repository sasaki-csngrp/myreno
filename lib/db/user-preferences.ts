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
  // UPSERTを使用して1回のクエリで処理
  await sql`
    INSERT INTO reno_user_recipe_preferences (user_id, recipe_id, rank, comment)
    VALUES (${userId}, ${recipeId}, ${rank}, NULL)
    ON CONFLICT (user_id, recipe_id)
    DO UPDATE SET rank = ${rank};
  `;
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
  
  // UPSERTを使用して1回のクエリで処理
  await sql`
    INSERT INTO reno_user_recipe_preferences (user_id, recipe_id, rank, comment)
    VALUES (${userId}, ${recipeId}, 0, ${trimmedComment})
    ON CONFLICT (user_id, recipe_id)
    DO UPDATE SET comment = ${trimmedComment};
  `;
}

