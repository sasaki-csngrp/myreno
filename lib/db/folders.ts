/**
 * フォルダー関連のデータベース関数
 */

import { sql } from '@vercel/postgres';

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

