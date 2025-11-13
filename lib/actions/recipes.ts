"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import * as db from "@/lib/db";
import type { Tag } from "@/lib/types/recipe";
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

  const userId = session.user.id;

  // lib/db.tsのgetRecipes()を使用
  const { recipes, hasMore } = await db.getRecipes(
    userId,
    limit,
    offset,
    'all',
    'all',
    'desc'
  );

  return {
    recipes,
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

  // フォルダー検索の場合
  if (folderName) {
    const { recipes, hasMore } = await db.getRecipesByFolder(
      userId,
      folderName,
      limit,
      offset,
      searchMode,
      searchRank,
      'desc'
    );
    return { recipes, hasMore };
  }

  // タグ検索の場合
  if (searchTag && searchTag.trim() !== "") {
    const { recipes, hasMore } = await db.getRecipesByTag(
      userId,
      searchTag,
      limit,
      offset,
      searchMode,
      searchRank,
      'desc'
    );
    return { recipes, hasMore };
  }

  // レシピID検索の場合（数値のみの入力）
  if (searchTerm && /^[0-9]+$/.test(searchTerm)) {
    const recipeId = parseInt(searchTerm, 10);
    const { recipes } = await db.getRecipeById(userId, recipeId);
    return { recipes, hasMore: false };
  }

  // タイトル検索の場合
  if (searchTerm && !/^[0-9]+$/.test(searchTerm)) {
    const { recipes, hasMore } = await db.getRecipesByTitle(
      userId,
      searchTerm,
      limit,
      offset,
      searchMode,
      searchRank,
      'desc'
    );
    return { recipes, hasMore };
  }

  // それ以外の場合は通常のレシピ一覧取得
  const { recipes, hasMore } = await db.getRecipes(
    userId,
    limit,
    offset,
    searchMode,
    searchRank,
    'desc'
  );

  return { recipes, hasMore };
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
): Promise<Tag[]> {
  // lib/db.tsのgetTagsByLevel()を使用
  return await db.getTagsByLevel(level, parentTagName);
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

  // lib/db.tsのgetRecipesByTag()を使用
  const { recipes, hasMore } = await db.getRecipesByTag(
    userId,
    tagName,
    limit,
    offset,
    mode,
    rank,
    sort
  );

  return {
    recipes,
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

  // lib/db.tsのupdateRank()を使用
  await db.updateRank(userId, recipeId, rank);
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

  // lib/db.tsのupdateComment()を使用
  await db.updateComment(userId, recipeId, comment);
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

  // lib/db.tsのgetFolders()を使用
  return await db.getFolders(userId, recipeId);
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

  // lib/db.tsのcreateFolder()を使用（既存チェックはlib/db.ts内で行う）
  await db.createFolder(userId, folderName.trim());
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

  // lib/db.tsのdeleteFolder()を使用
  await db.deleteFolder(userId, folderName);
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

  // lib/db.tsのaddRecipeToFolder()を使用
  await db.addRecipeToFolder(userId, folderName, recipeId);
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

  // lib/db.tsのremoveRecipeFromFolder()を使用
  await db.removeRecipeFromFolder(userId, folderName, recipeId);
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

  // lib/db.tsのgetFoldersWithImages()を使用
  return await db.getFoldersWithImages(userId);
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

  // lib/db.tsのgetRecipesByFolder()を使用
  const { recipes, hasMore } = await db.getRecipesByFolder(
    userId,
    folderName,
    limit,
    offset,
    'all',
    'all',
    'desc'
  );

  return {
    recipes,
    hasMore,
  };
}

