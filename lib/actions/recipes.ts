"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * レシピ一覧を取得するサーバーアクション
 * @param offset オフセット（ページネーション用）
 * @param limit 取得件数
 * @returns レシピ一覧と、次のページがあるかどうか
 */
export async function getRecipes(offset: number = 0, limit: number = 12) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  // レシピを取得（つくれぽ数降順でソート）
  const recipes = await prisma.renoRecipe.findMany({
    skip: offset,
    take: limit,
    orderBy: {
      tsukurepoCount: "desc",
    },
  });

  // ユーザーの評価・コメント・フォルダー情報を取得
  const userId = session.user.id;
  const recipeIds = recipes.map((r) => r.recipeId);
  
  const userPreferences = await prisma.renoUserRecipePreference.findMany({
    where: {
      userId: userId,
      recipeId: { in: recipeIds },
    },
  });

  // フォルダー情報を取得（フォルダーに登録されているかどうかを判定）
  const userFolders = await prisma.renoUserFolder.findMany({
    where: {
      userId: userId,
    },
  });

  // レシピIDをキーにしたマップを作成
  const preferenceMap = new Map(
    userPreferences.map((p) => [p.recipeId, p])
  );

  // フォルダーに登録されているレシピIDのセットを作成
  const folderRecipeIds = new Set<number>();
  userFolders.forEach((folder) => {
    if (folder.idOfRecipes) {
      const ids = folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      ids.forEach((id) => folderRecipeIds.add(id));
    }
  });

  // レシピにユーザー情報を付与
  const recipesWithUserData = recipes.map((recipe) => {
    const preference = preferenceMap.get(recipe.recipeId);
    const isInFolder = folderRecipeIds.has(recipe.recipeId);

    return {
      recipeId: recipe.recipeId,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      tsukurepoCount: recipe.tsukurepoCount,
      isMainDish: recipe.isMainDish,
      isSubDish: recipe.isSubDish,
      tag: recipe.tag,
      rank: preference?.rank ?? 0,
      comment: preference?.comment ?? null,
      isInFolder: isInFolder,
    };
  });

  // 次のページがあるかどうかを判定
  const totalCount = await prisma.renoRecipe.count();
  const hasMore = offset + limit < totalCount;

  return {
    recipes: recipesWithUserData,
    hasMore,
  };
}

