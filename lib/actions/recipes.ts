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

/**
 * レシピの評価（rank）を更新するサーバーアクション
 * @param recipeId レシピID
 * @param rank 評価値（0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない）
 */
export async function updateRank(recipeId: number, rank: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // 既存のレコードを確認
  const existing = await prisma.renoUserRecipePreference.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (existing) {
    // 既存のレコードを更新
    await prisma.renoUserRecipePreference.update({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
      data: {
        rank,
      },
    });
  } else {
    // 新規レコードを作成
    await prisma.renoUserRecipePreference.create({
      data: {
        userId,
        recipeId,
        rank,
      },
    });
  }
}

/**
 * レシピのコメントを更新するサーバーアクション
 * @param recipeId レシピID
 * @param comment コメント（空文字列の場合は削除）
 */
export async function updateComment(recipeId: number, comment: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // 既存のレコードを確認
  const existing = await prisma.renoUserRecipePreference.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (existing) {
    // 既存のレコードを更新
    await prisma.renoUserRecipePreference.update({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
      data: {
        comment: comment.trim() || null,
      },
    });
  } else {
    // 新規レコードを作成（コメントのみ）
    await prisma.renoUserRecipePreference.create({
      data: {
        userId,
        recipeId,
        rank: 0,
        comment: comment.trim() || null,
      },
    });
  }
}

/**
 * フォルダー一覧を取得するサーバーアクション（レシピの登録状態付き）
 * @param recipeId レシピID（このレシピが登録されているフォルダーを判定）
 * @returns フォルダー一覧（isInFolderフラグ付き）
 */
export async function fetchFolders(recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // ユーザーのフォルダー一覧を取得
  const folders = await prisma.renoUserFolder.findMany({
    where: {
      userId,
    },
    orderBy: {
      folderName: "asc",
    },
  });

  // レシピが登録されているフォルダーを判定
  const foldersWithStatus = folders.map((folder) => {
    let isInFolder = false;
    if (folder.idOfRecipes) {
      const ids = folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      isInFolder = ids.includes(recipeId);
    }

    return {
      foldername: folder.folderName,
      isInFolder,
    };
  });

  return foldersWithStatus;
}

/**
 * フォルダーを作成するサーバーアクション
 * @param folderName フォルダー名
 */
export async function createFolder(folderName: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダー名のバリデーション
  if (!folderName.trim()) {
    throw new Error("フォルダー名を入力してください");
  }

  // 既存のフォルダーを確認
  const existing = await prisma.renoUserFolder.findUnique({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName.trim(),
      },
    },
  });

  if (existing) {
    throw new Error("このフォルダー名は既に存在します");
  }

  // 新規フォルダーを作成
  await prisma.renoUserFolder.create({
    data: {
      userId,
      folderName: folderName.trim(),
      idOfRecipes: "",
    },
  });
}

/**
 * フォルダーを削除するサーバーアクション
 * @param folderName フォルダー名
 */
export async function deleteFolder(folderName: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを削除
  await prisma.renoUserFolder.delete({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
  });
}

/**
 * レシピをフォルダーに追加するサーバーアクション
 * @param folderName フォルダー名
 * @param recipeId レシピID
 */
export async function addRecipeToFolder(folderName: string, recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを取得
  const folder = await prisma.renoUserFolder.findUnique({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
  });

  if (!folder) {
    throw new Error("フォルダーが見つかりません");
  }

  // 既存のレシピIDリストを取得
  const existingIds = folder.idOfRecipes
    ? folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  // 既に登録されている場合は何もしない
  if (existingIds.includes(recipeId)) {
    return;
  }

  // レシピIDを追加
  const newIds = [...existingIds, recipeId];
  const newIdOfRecipes = newIds.join(" ");

  // フォルダーを更新
  await prisma.renoUserFolder.update({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
    data: {
      idOfRecipes: newIdOfRecipes,
    },
  });
}

/**
 * レシピをフォルダーから削除するサーバーアクション
 * @param folderName フォルダー名
 * @param recipeId レシピID
 */
export async function removeRecipeFromFolder(folderName: string, recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを取得
  const folder = await prisma.renoUserFolder.findUnique({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
  });

  if (!folder) {
    throw new Error("フォルダーが見つかりません");
  }

  // 既存のレシピIDリストを取得
  const existingIds = folder.idOfRecipes
    ? folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  // レシピIDを削除
  const newIds = existingIds.filter((id) => id !== recipeId);
  const newIdOfRecipes = newIds.join(" ");

  // フォルダーを更新
  await prisma.renoUserFolder.update({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
    data: {
      idOfRecipes: newIdOfRecipes,
    },
  });
}

/**
 * フォルダー一覧を取得するサーバーアクション（サムネイル画像付き）
 * @returns フォルダー一覧（サムネイル画像4枚付き）
 */
export async function fetchFoldersWithImages() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // ユーザーのフォルダー一覧を取得
  const folders = await prisma.renoUserFolder.findMany({
    where: {
      userId,
    },
    orderBy: {
      folderName: "asc",
    },
  });

  // 各フォルダーのサムネイル画像を取得
  const foldersWithImages = await Promise.all(
    folders.map(async (folder) => {
      let images: string[] = [];
      
      if (folder.idOfRecipes) {
        // レシピIDリストを取得
        const recipeIds = folder.idOfRecipes
          .split(" ")
          .filter((id) => id.trim() !== "")
          .map((id) => parseInt(id, 10))
          .filter((id) => !isNaN(id))
          .slice(0, 4); // 最大4件まで

        if (recipeIds.length > 0) {
          // レシピ画像を取得
          const recipes = await prisma.renoRecipe.findMany({
            where: {
              recipeId: { in: recipeIds },
            },
            select: {
              imageUrl: true,
            },
            take: 4,
          });

          images = recipes
            .map((r) => r.imageUrl)
            .filter((url): url is string => url !== null);
        }
      }

      return {
        foldername: folder.folderName,
        images,
      };
    })
  );

  return foldersWithImages;
}

/**
 * フォルダー内のレシピ一覧を取得するサーバーアクション
 * @param folderName フォルダー名
 * @param offset オフセット（ページネーション用）
 * @param limit 取得件数
 * @returns レシピ一覧と、次のページがあるかどうか
 */
export async function getRecipesByFolder(
  folderName: string,
  offset: number = 0,
  limit: number = 12
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを取得
  const folder = await prisma.renoUserFolder.findUnique({
    where: {
      userId_folderName: {
        userId,
        folderName: folderName,
      },
    },
  });

  if (!folder) {
    throw new Error("フォルダーが見つかりません");
  }

  // フォルダー内のレシピIDリストを取得
  const recipeIds = folder.idOfRecipes
    ? folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  if (recipeIds.length === 0) {
    return {
      recipes: [],
      hasMore: false,
    };
  }

  // レシピを取得（つくれぽ数降順でソート）
  const recipes = await prisma.renoRecipe.findMany({
    where: {
      recipeId: { in: recipeIds },
    },
    skip: offset,
    take: limit + 1, // 次のページがあるかどうかを判定するため+1
    orderBy: {
      tsukurepoCount: "desc",
    },
  });

  // 次のページがあるかどうかを判定
  const hasMore = recipes.length > limit;
  const recipesToReturn = hasMore ? recipes.slice(0, limit) : recipes;

  // ユーザーの評価・コメント・フォルダー情報を取得
  const recipeIdsForPrefs = recipesToReturn.map((r) => r.recipeId);
  
  const userPreferences = await prisma.renoUserRecipePreference.findMany({
    where: {
      userId: userId,
      recipeId: { in: recipeIdsForPrefs },
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
    userPreferences.map((pref) => [pref.recipeId, pref])
  );

  const folderMap = new Map(
    userFolders.map((folder) => [
      folder.folderName,
      folder.idOfRecipes
        ? folder.idOfRecipes
            .split(" ")
            .filter((id) => id.trim() !== "")
            .map((id) => parseInt(id, 10))
            .filter((id) => !isNaN(id))
        : [],
    ])
  );

  // レシピにユーザー情報を付与
  const recipesWithUserData = recipesToReturn.map((recipe) => {
    const preference = preferenceMap.get(recipe.recipeId);
    const isInFolder = Array.from(folderMap.values()).some((ids) =>
      ids.includes(recipe.recipeId)
    );

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

  return {
    recipes: recipesWithUserData,
    hasMore,
  };
}

