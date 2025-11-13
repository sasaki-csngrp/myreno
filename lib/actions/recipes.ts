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

  // タグフィルタ（フェーズ6で実装）
  // タグフィルタはDB層では実装が難しいため、取得後にフィルタリング
  // ただし、タグフィルタが指定されている場合は、まずタグでフィルタリングしてから取得
  let recipes: any[] = [];
  if (searchTag && searchTag.trim() !== "") {
    // タグでフィルタリング: reno_recipesテーブルのtagカラム（スペース区切り文字列）から該当するタグ名を含むレシピを検索
    const allRecipes = await prisma.renoRecipe.findMany({
      where,
    });

    // スペース区切り文字列から正確にタグ名を抽出してフィルタリング
    const tagFilteredRecipes = allRecipes.filter((recipe) => {
      if (!recipe.tag) return false;
      const tags = recipe.tag.split(" ").filter((t) => t.trim() !== "");
      return tags.includes(searchTag);
    });

    // ソートを適用
    tagFilteredRecipes.sort((a, b) => b.tsukurepoCount - a.tsukurepoCount);

    // ページネーション
    recipes = tagFilteredRecipes.slice(offset, offset + limit);
  } else {
    // タグフィルタがない場合は通常通り取得
    // ソート条件（つくれぽ数降順で固定）
    const orderBy = {
      tsukurepoCount: 'desc' as const,
    };

    // レシピを取得（DB層でフィルタリング）
    recipes = await prisma.renoRecipe.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy,
    });
  }

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
 * タグ名に一致するレシピ数を取得するヘルパー関数
 * @param tagName タグ名
 * @returns レシピ数
 */
async function getRecipeCountByTag(tagName: string): Promise<number> {
  // reno_recipesテーブルのtagカラム（スペース区切り文字列）から該当するタグ名を含むレシピをカウント
  const recipes = await prisma.renoRecipe.findMany({
    where: {
      tag: {
        contains: tagName,
      },
    },
  });

  // スペース区切り文字列から正確にタグ名を抽出してカウント
  let count = 0;
  for (const recipe of recipes) {
    if (recipe.tag) {
      const tags = recipe.tag.split(" ").filter((t) => t.trim() !== "");
      if (tags.includes(tagName)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * 指定されたレベルのタグ一覧を取得するサーバーアクション
 * @param level タグのレベル（0: 大タグ, 1: 中タグ, 2: 小タグ, 3: 極小タグ）
 * @param parentTagName 親タグ名（階層ナビゲーション用、空文字列の場合は大タグを取得）
 * @returns タグ一覧（表示名、タグ名、画像URI、子タグ数/レシピ数）
 */
export async function getTagsByLevel(
  level: number,
  parentTagName: string = ""
): Promise<Array<{
  tagId: number;
  dispname: string;
  name: string;
  imageUri: string | null;
  hasImageUri: boolean;
  hasChildren: string; // "▼" または "X 件" 形式
}>> {
  // 認証チェックは不要（タグマスタは全ユーザー共通）

  let whereClause: any = {
    level,
  };

  // 親タグ名が指定されている場合、階層を絞り込む
  if (parentTagName && level > 0) {
    // 親タグの情報を取得
    const parentTag = await prisma.renoTagMaster.findFirst({
      where: {
        name: parentTagName,
      },
    });

    if (!parentTag) {
      return [];
    }

    // レベルに応じて親タグの階層情報を使用してフィルタリング
    if (level === 1) {
      // 中タグ: 親タグのl（大タグ）と一致するものを取得
      whereClause.l = parentTag.l;
    } else if (level === 2) {
      // 小タグ: 親タグのl, m（大タグ、中タグ）と一致するものを取得
      whereClause.l = parentTag.l;
      whereClause.m = parentTag.m;
    } else if (level === 3) {
      // 極小タグ: 親タグのl, m, s（大タグ、中タグ、小タグ）と一致するものを取得
      whereClause.l = parentTag.l;
      whereClause.m = parentTag.m;
      whereClause.s = parentTag.s;
    }
  }

  // タグを取得
  const tags = await prisma.renoTagMaster.findMany({
    where: whereClause,
    orderBy: {
      tagId: "asc",
    },
  });

  // 各タグの子タグ数またはレシピ数を取得
  const tagsWithCounts = await Promise.all(
    tags.map(async (tag) => {
      let hasChildren: string = "";

      if (level < 3) {
        // 子タグがあるかどうかを確認
        let childWhereClause: any = {
          level: level + 1,
        };

        if (level === 0) {
          childWhereClause.l = tag.l;
        } else if (level === 1) {
          childWhereClause.l = tag.l;
          childWhereClause.m = tag.m;
        } else if (level === 2) {
          childWhereClause.l = tag.l;
          childWhereClause.m = tag.m;
          childWhereClause.s = tag.s;
        }

        const childCount = await prisma.renoTagMaster.count({
          where: childWhereClause,
        });

        if (childCount > 0) {
          hasChildren = "▼";
        } else {
          // 子タグがない場合はレシピ数を取得
          const recipeCount = await getRecipeCountByTag(tag.name || "");
          hasChildren = recipeCount > 0 ? `${recipeCount} 件` : "0 件";
        }
      } else {
        // 極小タグの場合はレシピ数のみ
        const recipeCount = await getRecipeCountByTag(tag.name || "");
        hasChildren = recipeCount > 0 ? `${recipeCount} 件` : "0 件";
      }

      // 画像URIを取得（レシピから取得）
      let imageUri: string | null = null;
      if (tag.name) {
        // タグ名に一致するレシピを取得（つくれぽ数降順でソート）
        const recipeWithTag = await prisma.renoRecipe.findFirst({
          where: {
            tag: {
              contains: tag.name,
            },
          },
          orderBy: {
            tsukurepoCount: "desc",
          },
          select: {
            imageUrl: true,
          },
        });
        imageUri = recipeWithTag?.imageUrl || null;
      }

      return {
        tagId: tag.tagId,
        dispname: tag.dispname || "",
        name: tag.name || "",
        imageUri,
        hasImageUri: imageUri ? true : false,
        hasChildren,
      };
    })
  );

  return tagsWithCounts;
}

/**
 * タグでレシピを検索するサーバーアクション
 * @param tagName タグ名
 * @param offset オフセット（ページネーション用）
 * @param limit 取得件数
 * @param mode 分類フィルタ（all, main_dish, sub_dish, others）
 * @param rank いいねフィルタ（all, 1, 2）
 * @param sort ソート順（asc, desc）
 * @returns レシピ一覧と、次のページがあるかどうか
 */
export async function getRecipesByTag(
  tagName: string,
  offset: number = 0,
  limit: number = 12,
  mode: "all" | "main_dish" | "sub_dish" | "others" = "all",
  rank: "all" | "1" | "2" = "all",
  sort: "asc" | "desc" = "desc"
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // タグ名に一致するレシピを取得
  // reno_recipesテーブルのtagカラム（スペース区切り文字列）から該当するタグ名を含むレシピを検索
  const allRecipes = await prisma.renoRecipe.findMany({
    where: {
      tag: {
        contains: tagName,
      },
    },
  });

  // スペース区切り文字列から正確にタグ名を抽出してフィルタリング
  const filteredRecipes = allRecipes.filter((recipe) => {
    if (!recipe.tag) return false;
    const tags = recipe.tag.split(" ").filter((t) => t.trim() !== "");
    return tags.includes(tagName);
  });

  // 分類フィルタを適用
  let modeFilteredRecipes = filteredRecipes;
  if (mode === "main_dish") {
    modeFilteredRecipes = filteredRecipes.filter((r) => r.isMainDish);
  } else if (mode === "sub_dish") {
    modeFilteredRecipes = filteredRecipes.filter((r) => r.isSubDish);
  } else if (mode === "others") {
    modeFilteredRecipes = filteredRecipes.filter(
      (r) => !r.isMainDish && !r.isSubDish
    );
  }

  // ソートを適用
  let sortedRecipes = [...modeFilteredRecipes];
  if (sort === "desc") {
    sortedRecipes.sort((a, b) => b.tsukurepoCount - a.tsukurepoCount);
  } else {
    sortedRecipes.sort((a, b) => a.tsukurepoCount - b.tsukurepoCount);
  }

  // ページネーション
  const paginatedRecipes = sortedRecipes.slice(offset, offset + limit + 1);
  const hasMore = paginatedRecipes.length > limit;
  const recipesToReturn = hasMore
    ? paginatedRecipes.slice(0, limit)
    : paginatedRecipes;

  // ユーザーの評価・コメント・フォルダー情報を取得
  const recipeIdsForPrefs = recipesToReturn.map((r) => r.recipeId);

  const userPreferences = await prisma.renoUserRecipePreference.findMany({
    where: {
      userId: userId,
      recipeId: { in: recipeIdsForPrefs },
    },
  });

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

  // いいねフィルタを適用（ユーザー情報を付与した後）
  let rankFilteredRecipes = recipesWithUserData;
  if (rank === "1") {
    rankFilteredRecipes = recipesWithUserData.filter((r) => r.rank === 1);
  } else if (rank === "2") {
    rankFilteredRecipes = recipesWithUserData.filter((r) => r.rank === 2);
  }

  return {
    recipes: rankFilteredRecipes,
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

