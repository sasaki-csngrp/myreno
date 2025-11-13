"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type SearchMode = 'all' | 'main_dish' | 'sub_dish' | 'others';
export type RankFilter = 'all' | '1' | '2';

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

/**
 * 検索・フィルタリング条件に基づいてレシピ一覧を取得するサーバーアクション
 * **DB層で実装**: Prismaクエリを使用してデータベースレベルでフィルタリングを実行します。
 * @param offset オフセット（ページネーション用）
 * @param limit 取得件数
 * @param searchTerm 検索文字列（タイトル検索またはレシピID検索）
 * @param searchMode 分類フィルタ（all, main_dish, sub_dish, others）
 * @param searchTag タグ名（フェーズ6で使用）
 * @param folderName フォルダー名（フェーズ5で使用）
 * @param searchRank いいねフィルタ（all, 1, 2）
 * @returns レシピ一覧と、次のページがあるかどうか
 */
export async function getFilteredRecipes(
  offset: number = 0,
  limit: number = 12,
  searchTerm?: string,
  searchMode: SearchMode = 'all',
  searchTag?: string,
  folderName?: string,
  searchRank: RankFilter = 'all'
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // レシピID検索の場合（数値のみの入力）
  if (searchTerm && /^[0-9]+$/.test(searchTerm)) {
    const recipeId = parseInt(searchTerm, 10);
    const recipe = await prisma.renoRecipe.findUnique({
      where: { recipeId },
    });

    if (!recipe) {
      return { recipes: [], hasMore: false };
    }

    // ユーザー情報を取得
    const preference = await prisma.renoUserRecipePreference.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    // フォルダー情報を取得
    const userFolders = await prisma.renoUserFolder.findMany({
      where: { userId },
    });
    const isInFolder = userFolders.some((folder) => {
      if (!folder.idOfRecipes) return false;
      const ids = folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      return ids.includes(recipeId);
    });

    return {
      recipes: [
        {
          recipeId: recipe.recipeId,
          title: recipe.title,
          imageUrl: recipe.imageUrl,
          tsukurepoCount: recipe.tsukurepoCount,
          isMainDish: recipe.isMainDish,
          isSubDish: recipe.isSubDish,
          tag: recipe.tag,
          rank: preference?.rank ?? 0,
          comment: preference?.comment ?? null,
          isInFolder,
        },
      ],
      hasMore: false,
    };
  }

  // 検索条件を構築
  const where: any = {};

  // タイトル検索（部分一致）
  if (searchTerm && !/^[0-9]+$/.test(searchTerm)) {
    where.title = {
      contains: searchTerm,
      mode: 'insensitive', // 大文字小文字を区別しない（PostgreSQLの場合）
    };
  }

  // 分類フィルタ（DB層で実装）
  if (searchMode === 'main_dish') {
    where.isMainDish = true;
  } else if (searchMode === 'sub_dish') {
    where.isSubDish = true;
  } else if (searchMode === 'others') {
    where.isMainDish = false;
    where.isSubDish = false;
  }

  // ソート条件（つくれぽ数降順で固定）
  const orderBy = {
    tsukurepoCount: 'desc' as const,
  };

  // レシピを取得（DB層でフィルタリング）
  const recipes = await prisma.renoRecipe.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy,
  });

  // ユーザーの評価・コメント・フォルダー情報を取得
  const recipeIds = recipes.map((r) => r.recipeId);
  
  const userPreferences = await prisma.renoUserRecipePreference.findMany({
    where: {
      userId,
      recipeId: { in: recipeIds },
    },
  });

  // フォルダー情報を取得
  const userFolders = await prisma.renoUserFolder.findMany({
    where: { userId },
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

  // いいねフィルタを適用（ユーザー情報を取得した後）
  let filteredRecipes = recipes.map((recipe) => {
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
      isInFolder,
    };
  });

  // いいねフィルタを適用
  if (searchRank === '1') {
    filteredRecipes = filteredRecipes.filter((r) => r.rank === 1);
  } else if (searchRank === '2') {
    filteredRecipes = filteredRecipes.filter((r) => r.rank === 2);
  }

  // 次のページがあるかどうかを判定
  // いいねフィルタを適用する前の総数を取得する必要があるため、
  // いいねフィルタが適用されている場合は正確なhasMoreを計算できない
  // そのため、取得したレシピ数がlimit未満の場合はhasMore=falseとする
  const hasMore = filteredRecipes.length === limit;

  return {
    recipes: filteredRecipes,
    hasMore,
  };
}

