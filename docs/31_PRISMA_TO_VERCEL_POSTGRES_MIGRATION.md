# Prismaから@vercel/postgresへの移行計画

## 1. 概要

### 1.1 目的
Vercelのサーバーレス環境でのパフォーマンス改善のため、レシピ関連のデータベースアクセスをPrismaから`@vercel/postgres`（直接SQL）に移行する。

### 1.2 背景
- **問題**: Vercelのサーバーレス環境では、Prismaクライアントのシングルトン化が機能しない
- **影響**: コールドスタート時に毎回Prismaクライアントが初期化され、50〜200ms程度のオーバーヘッドが発生
- **解決策**: `@vercel/postgres`を使用した直接SQLクエリに変更することで、初期化コストを削減

### 1.3 移行方針
- **NextAuth.js関連**: Prismaを継続使用（変更不要、影響が小さい）
- **レシピ関連**: `@vercel/postgres`に変更（パフォーマンス改善が大きい）

### 1.4 期待される効果
- コールドスタート時のレスポンス時間改善（50〜200ms削減）
- レシピ一覧取得の高速化
- つくおめと同等のパフォーマンス

---

## 2. 変更範囲

### 2.1 変更が必要なファイル

#### 新規作成
- `lib/db.ts` - つくおめスタイルのDB関数（新規作成）

#### 変更が必要なファイル
- `lib/actions/recipes.ts` - 約39箇所のPrismaクエリをSQLに変更

#### 変更が不要なファイル
- `app/api/auth/[...nextauth]/route.ts` - Prismaのまま（NextAuth.js用）
- `lib/verification.ts` - Prismaのまま（VerificationTokenテーブル）
- `lib/prisma.ts` - Prismaクライアント設定（NextAuth.js用に残す）

### 2.2 Prismaスキーマの扱い

#### 残すモデル（NextAuth.js用）
- `User` - reno_usersテーブル
- `Account` - reno_accountsテーブル
- `Session` - reno_sessionsテーブル
- `VerificationToken` - reno_verification_tokensテーブル

#### 削除可能なモデル（レシピ関連）
- `RenoRecipe` - reno_recipesテーブル（型定義として残しても可）
- `RenoUserRecipePreference` - reno_user_recipe_preferencesテーブル
- `RenoUserFolder` - reno_user_foldersテーブル
- `RenoTagMaster` - reno_tag_masterテーブル

---

## 3. テーブル構造マッピング

### 3.1 テーブル名とカラム名の対応

| Prismaモデル | テーブル名 | 主なカラム |
|------------|----------|-----------|
| `RenoRecipe` | `reno_recipes` | `recipe_id`, `title`, `image_url`, `tsukurepo_count`, `is_main_dish`, `is_sub_dish`, `tag` |
| `RenoUserRecipePreference` | `reno_user_recipe_preferences` | `user_id`, `recipe_id`, `rank`, `comment` |
| `RenoUserFolder` | `reno_user_folders` | `folder_id`, `user_id`, `folder_name`, `id_of_recipes` |
| `RenoTagMaster` | `reno_tag_master` | `tag_id`, `level`, `dispname`, `name`, `l`, `m`, `s`, `ss` |

### 3.2 データ型の対応

| Prisma型 | PostgreSQL型 | 注意事項 |
|---------|-------------|---------|
| `Int` | `INTEGER` | - |
| `String` | `VARCHAR` | 長さに注意 |
| `String?` | `VARCHAR` (NULL可) | - |
| `Boolean` | `BOOLEAN` | `true`/`false` → `1`/`0` |
| `DateTime` | `TIMESTAMP(6)` | - |
| `@db.Uuid` | `UUID` | - |

---

## 4. 実装手順

### フェーズ1: 準備 ✅ 完了

1. **依存関係の確認** ✅
   - `@vercel/postgres`が既にインストールされていることを確認
   - バージョン: `^0.5.1`（現在のバージョン）
   - 確認済み: `package.json`に`"@vercel/postgres": "^0.5.1"`が含まれている

2. **型定義の準備** ✅
   - レシピ関連の型定義を確認
   - Prismaの型から独立した型定義を作成
   - 作成済み: `lib/types/recipe.ts`
     - `Recipe` - レシピデータ型
     - `RecipeListResult` - レシピ一覧取得結果型
     - `SearchMode` - 検索モード型
     - `RankFilter` - いいねフィルタ型
     - `SortOrder` - ソート順型
     - `Tag` - タグ情報型
     - `Folder` - フォルダー情報型
     - `FolderWithImages` - サムネイル画像付きフォルダー情報型
     - `GetRecipesParams` - レシピ取得パラメータ型
     - `SearchRecipesParams` - レシピ検索パラメータ型

### フェーズ2: `lib/db.ts`の作成 ✅ 完了

つくおめの`lib/db.ts`を参考に、myrenoのテーブル構造に合わせて実装。

#### 実装した関数一覧 ✅

1. **レシピ取得系** ✅
   - `getRecipes()` - レシピ一覧取得
   - `getRecipesByTitle()` - タイトル検索
   - `getRecipesByTag()` - タグ検索
   - `getRecipesByFolder()` - フォルダー内レシピ取得
   - `getRecipeById()` - レシピID検索

2. **レシピ更新系** ✅
   - `updateRank()` - いいね状態更新
   - `updateComment()` - コメント更新

3. **タグ関連** ✅
   - `getTagsByLevel()` - レベル別タグ取得
   - `getRecipeCountByTag()` - タグ別レシピ数取得

4. **フォルダー関連** ✅
   - `getFolders()` - フォルダー一覧取得
   - `createFolder()` - フォルダー作成
   - `deleteFolder()` - フォルダー削除
   - `addRecipeToFolder()` - レシピをフォルダーに追加
   - `removeRecipeFromFolder()` - レシピをフォルダーから削除
   - `getFoldersWithImages()` - サムネイル画像付きフォルダー一覧

**実装完了**: `lib/db.ts`を作成し、全関数を実装済み

### フェーズ3: `lib/actions/recipes.ts`の変更

各関数をPrismaクエリから`lib/db.ts`の関数呼び出しに変更。

**分割案**: フェーズ3は以下の3つのサブフェーズに分割可能

#### フェーズ3-1: レシピ取得系関数の変更
- `getRecipes()` - レシピ一覧取得
- `getFilteredRecipes()` - 統合検索（最も複雑）
- `getRecipesByTag()` - タグ検索
- `getRecipesByFolder()` - フォルダー内レシピ取得
- `getTagsByLevel()` - レベル別タグ取得

**推定作業時間**: 1〜1.5時間

#### フェーズ3-2: レシピ更新系関数の変更
- `updateRank()` - いいね状態更新
- `updateComment()` - コメント更新

**推定作業時間**: 30分〜1時間

#### フェーズ3-3: フォルダー関連関数の変更
- `fetchFolders()` - フォルダー一覧取得
- `createFolder()` - フォルダー作成
- `deleteFolder()` - フォルダー削除
- `addRecipeToFolder()` - レシピをフォルダーに追加
- `removeRecipeFromFolder()` - レシピをフォルダーから削除
- `fetchFoldersWithImages()` - サムネイル画像付きフォルダー一覧

**推定作業時間**: 1〜1.5時間

**推奨分割点**: フェーズ3-1とフェーズ3-2の間、またはフェーズ3-2とフェーズ3-3の間

---

## 5. 実装詳細

### 5.1 `lib/db.ts`の基本構造

```typescript
import { sql } from '@vercel/postgres';

// ヘルパー関数
function getModeWhereClause(mode: string): string {
  switch (mode) {
    case 'main_dish':
      return 'AND is_main_dish = true';
    case 'sub_dish':
      return 'AND is_sub_dish = true';
    case 'others':
      return 'AND (is_main_dish = false AND is_sub_dish = false)';
    default:
      return '';
  }
}

function getRankWhereClause(rank: string): string {
  switch (rank) {
    case '1':
      return 'AND rank = 1';
    case '2':
      return 'AND rank = 2';
    case 'all':
    default:
      return '';
  }
}

// レシピ取得関数
export async function getRecipes(
  userId: string,
  limit: number,
  offset: number,
  mode: string = 'all',
  rank: string = 'all'
): Promise<{ recipes: any[], hasMore: boolean }> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  
  // ユーザーの評価情報をJOINで取得
  const query = `
    SELECT
      r.recipe_id,
      r.title,
      r.image_url,
      r.tsukurepo_count,
      r.is_main_dish,
      r.is_sub_dish,
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as is_in_folder
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE 1=1 ${modeWhereClause}
    ORDER BY r.tsukurepo_count DESC, r.recipe_id DESC
    LIMIT $2 OFFSET $3;
  `;
  
  const { rows } = await sql.query(query, [userId, limit, offset]);
  const hasMore = rows.length === limit;
  
  return { recipes: rows, hasMore };
}
```

### 5.2 タイトル検索の実装

```typescript
export async function getRecipesByTitle(
  userId: string,
  searchTerm: string,
  limit: number,
  offset: number,
  mode: string = 'all',
  rank: string = 'all'
): Promise<{ recipes: any[], hasMore: boolean }> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const searchPattern = `%${searchTerm}%`;
  
  const query = `
    SELECT
      r.recipe_id,
      r.title,
      r.image_url,
      r.tsukurepo_count,
      r.is_main_dish,
      r.is_sub_dish,
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as is_in_folder
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.title ILIKE $2 ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count DESC, r.recipe_id DESC
    LIMIT $3 OFFSET $4;
  `;
  
  const { rows } = await sql.query(query, [userId, searchPattern, limit, offset]);
  const hasMore = rows.length === limit;
  
  return { recipes: rows, hasMore };
}
```

### 5.3 タグ検索の実装

```typescript
export async function getRecipesByTag(
  userId: string,
  tagName: string,
  limit: number,
  offset: number,
  mode: string = 'all',
  rank: string = 'all',
  sort: 'asc' | 'desc' = 'desc'
): Promise<{ recipes: any[], hasMore: boolean }> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  const sortOrder = sort.toUpperCase();
  
  const query = `
    SELECT
      r.recipe_id,
      r.title,
      r.image_url,
      r.tsukurepo_count,
      r.is_main_dish,
      r.is_sub_dish,
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as is_in_folder
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE $2 = ANY(string_to_array(r.tag, ' ')) ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count ${sortOrder}, r.recipe_id DESC
    LIMIT $3 OFFSET $4;
  `;
  
  const { rows } = await sql.query(query, [userId, tagName, limit, offset]);
  const hasMore = rows.length === limit;
  
  return { recipes: rows, hasMore };
}
```

### 5.4 フォルダー内レシピ取得の実装

```typescript
export async function getRecipesByFolder(
  userId: string,
  folderName: string,
  limit: number,
  offset: number,
  mode: string = 'all',
  rank: string = 'all'
): Promise<{ recipes: any[], hasMore: boolean }> {
  const modeWhereClause = getModeWhereClause(mode);
  const rankWhereClause = getRankWhereClause(rank);
  
  const query = `
    SELECT
      r.recipe_id,
      r.title,
      r.image_url,
      r.tsukurepo_count,
      r.is_main_dish,
      r.is_sub_dish,
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      true as is_in_folder
    FROM reno_recipes r
    JOIN reno_user_folders uf ON uf.user_id = $1 AND uf.folder_name = $2
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.recipe_id::text = ANY(string_to_array(uf.id_of_recipes, ' '))
      ${modeWhereClause} ${rankWhereClause}
    ORDER BY r.tsukurepo_count DESC, r.recipe_id DESC
    LIMIT $3 OFFSET $4;
  `;
  
  const { rows } = await sql.query(query, [userId, folderName, limit, offset]);
  const hasMore = rows.length === limit;
  
  return { recipes: rows, hasMore };
}
```

### 5.5 レシピID検索の実装

```typescript
export async function getRecipeById(
  userId: string,
  recipeId: number
): Promise<{ recipes: any[], hasMore: boolean }> {
  const query = `
    SELECT
      r.recipe_id,
      r.title,
      r.image_url,
      r.tsukurepo_count,
      r.is_main_dish,
      r.is_sub_dish,
      r.tag,
      COALESCE(urp.rank, 0) as rank,
      urp.comment,
      EXISTS (
        SELECT 1
        FROM reno_user_folders uf
        WHERE uf.user_id = $1 
          AND ' ' || COALESCE(uf.id_of_recipes, '') || ' ' LIKE '% ' || r.recipe_id::text || ' %'
      ) as is_in_folder
    FROM reno_recipes r
    LEFT JOIN reno_user_recipe_preferences urp 
      ON r.recipe_id = urp.recipe_id AND urp.user_id = $1
    WHERE r.recipe_id = $2;
  `;
  
  const { rows } = await sql.query(query, [userId, recipeId]);
  
  return { recipes: rows, hasMore: false };
}
```

### 5.6 いいね状態更新の実装

```typescript
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
```

### 5.7 コメント更新の実装

```typescript
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
```

### 5.8 タグ取得の実装

```typescript
export async function getTagsByLevel(
  level: number,
  parentTagName: string = ""
): Promise<Array<{
  tagId: number;
  dispname: string;
  name: string;
  imageUri: string | null;
  hasImageUri: boolean;
  hasChildren: string;
}>> {
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
      t.tag_id,
      t.dispname,
      t.name,
      (SELECT image_url FROM reno_recipes 
       WHERE tag LIKE '%' || t.name || '%' 
       ORDER BY tsukurepo_count DESC, recipe_id DESC LIMIT 1) AS image_uri,
      (SELECT COUNT(*) FROM reno_tag_master 
       WHERE level = t.level + 1 AND ${childTagCondition}) AS child_tag_count,
      (SELECT COUNT(*) FROM reno_recipes 
       WHERE tag IS NOT NULL AND tag != '' 
         AND t.name = ANY(string_to_array(tag, ' '))) AS recipe_count
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
    }
    params = [level, parentTagName];
  }
  
  const { rows } = await sql.query(query, params);
  
  return rows.map(row => {
    const childTagCount = parseInt(row.child_tag_count, 10);
    const recipeCount = parseInt(row.recipe_count, 10);
    const imageUri = row.image_uri;
    
    let hasChildren: string;
    if (childTagCount > 0) {
      hasChildren = "▼";
    } else {
      hasChildren = `${recipeCount} 件`;
    }
    
    return {
      tagId: row.tag_id,
      dispname: row.dispname || "",
      name: row.name || "",
      imageUri: imageUri || null,
      hasImageUri: imageUri ? true : false,
      hasChildren,
    };
  });
}
```

### 5.9 フォルダー操作の実装

```typescript
// フォルダー一覧取得
export async function getFolders(
  userId: string,
  recipeId: number | null
): Promise<Array<{ foldername: string; isInFolder: boolean }>> {
  if (recipeId !== null) {
    const { rows } = await sql`
      SELECT
        folder_name as foldername,
        ${recipeId}::text = ANY(string_to_array(COALESCE(id_of_recipes, ''), ' ')) as "isInFolder"
      FROM reno_user_folders
      WHERE user_id = ${userId}
      ORDER BY folder_name ASC;
    `;
    return rows;
  } else {
    const { rows } = await sql`
      SELECT
        folder_name as foldername,
        false as "isInFolder"
      FROM reno_user_folders
      WHERE user_id = ${userId}
      ORDER BY folder_name ASC;
    `;
    return rows;
  }
}

// フォルダー作成
export async function createFolder(
  userId: string,
  folderName: string
): Promise<void> {
  await sql`
    INSERT INTO reno_user_folders (user_id, folder_name, id_of_recipes)
    VALUES (${userId}, ${folderName.trim()}, '');
  `;
}

// フォルダー削除
export async function deleteFolder(
  userId: string,
  folderName: string
): Promise<void> {
  await sql`
    DELETE FROM reno_user_folders
    WHERE user_id = ${userId} AND folder_name = ${folderName};
  `;
}

// レシピをフォルダーに追加
export async function addRecipeToFolder(
  userId: string,
  folderName: string,
  recipeId: number
): Promise<void> {
  // 既存のレシピIDリストを取得
  const { rows } = await sql`
    SELECT id_of_recipes
    FROM reno_user_folders
    WHERE user_id = ${userId} AND folder_name = ${folderName};
  `;
  
  if (rows.length === 0) {
    throw new Error("フォルダーが見つかりません");
  }
  
  const existingIds = rows[0].id_of_recipes 
    ? rows[0].id_of_recipes.split(" ").filter(id => id.trim() !== "")
    : [];
  
  if (existingIds.includes(recipeId.toString())) {
    return; // 既に登録されている
  }
  
  const newIds = [...existingIds, recipeId.toString()];
  const newIdOfRecipes = newIds.join(" ");
  
  await sql`
    UPDATE reno_user_folders
    SET id_of_recipes = ${newIdOfRecipes}
    WHERE user_id = ${userId} AND folder_name = ${folderName};
  `;
}

// レシピをフォルダーから削除
export async function removeRecipeFromFolder(
  userId: string,
  folderName: string,
  recipeId: number
): Promise<void> {
  // 既存のレシピIDリストを取得
  const { rows } = await sql`
    SELECT id_of_recipes
    FROM reno_user_folders
    WHERE user_id = ${userId} AND folder_name = ${folderName};
  `;
  
  if (rows.length === 0) {
    throw new Error("フォルダーが見つかりません");
  }
  
  const existingIds = rows[0].id_of_recipes 
    ? rows[0].id_of_recipes.split(" ").filter(id => id.trim() !== "")
    : [];
  
  const newIds = existingIds.filter(id => id !== recipeId.toString());
  const newIdOfRecipes = newIds.join(" ");
  
  await sql`
    UPDATE reno_user_folders
    SET id_of_recipes = ${newIdOfRecipes}
    WHERE user_id = ${userId} AND folder_name = ${folderName};
  `;
}

// サムネイル画像付きフォルダー一覧
export async function getFoldersWithImages(
  userId: string
): Promise<Array<{ foldername: string; images: string[] }>> {
  const { rows } = await sql`
    SELECT
      f.folder_name as foldername,
      ARRAY(
        SELECT r.image_url
        FROM reno_recipes r
        WHERE r.recipe_id::text = ANY(string_to_array(f.id_of_recipes, ' '))
        LIMIT 4
      ) as images
    FROM reno_user_folders f
    WHERE f.user_id = ${userId}
    ORDER BY f.folder_name ASC;
  `;
  
  return rows.map(row => ({
    foldername: row.foldername,
    images: (row.images || []).filter((url: string) => url !== null),
  }));
}
```

### 5.10 `lib/actions/recipes.ts`の変更例

```typescript
// 変更前（Prisma）
import { prisma } from "@/lib/prisma";

export async function getRecipes(offset: number = 0, limit: number = 12) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }
  
  const recipes = await prisma.renoRecipe.findMany({
    skip: offset,
    take: limit,
    orderBy: { tsukurepoCount: "desc" },
  });
  
  // ... ユーザー情報の取得とマージ
}

// 変更後（@vercel/postgres）
import * as db from "@/lib/db";

export async function getRecipes(offset: number = 0, limit: number = 12) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }
  
  const { recipes, hasMore } = await db.getRecipes(
    session.user.id,
    limit,
    offset,
    'all',
    'all'
  );
  
  return { recipes, hasMore };
}
```

---

## 6. 注意事項

### 6.1 SQLインジェクション対策
- **必須**: すべてのクエリでパラメータ化クエリを使用
- `sql.query(query, [param1, param2, ...])` または `sql\`...\`` 形式を使用
- 文字列連結によるSQL構築は絶対に避ける

### 6.2 型安全性
- Prismaの型チェックがなくなるため、手動で型定義を管理
- 必要に応じて型定義ファイルを作成

### 6.3 エラーハンドリング
- データベースエラーを適切にキャッチして処理
- ユーザーフレンドリーなエラーメッセージを返す

### 6.4 パフォーマンス
- JOINクエリを適切に使用してN+1問題を回避
- インデックスを活用したクエリを書く
- 必要に応じてクエリを最適化

### 6.5 テスト
- 各関数を個別にテスト
- エッジケース（空の結果、NULL値など）をテスト
- 実際のデータベースを使用した統合テストを実施

---

## 7. テスト計画

### 7.1 単体テスト
- 各DB関数の動作確認
- パラメータのバリデーション
- エラーハンドリング

### 7.2 統合テスト
- レシピ一覧表示
- 検索機能
- フィルタリング機能
- フォルダー操作

### 7.3 パフォーマンステスト
- コールドスタート時のレスポンス時間
- レシピ一覧取得の速度
- つくおめとの比較

### 7.4 回帰テスト
- 既存機能の動作確認
- NextAuth.jsの動作確認
- エッジケースの確認

---

## 8. 移行チェックリスト

### 実装前
- [ ] つくおめの`lib/db.ts`を参考に実装方針を確認
- [ ] テーブル構造とカラム名を確認
- [ ] 型定義を準備

### 実装中
- [ ] `lib/db.ts`を作成
- [ ] 各DB関数を実装
- [ ] `lib/actions/recipes.ts`を変更
- [ ] エラーハンドリングを実装

### 実装後
- [ ] 単体テストを実施
- [ ] 統合テストを実施
- [ ] パフォーマンステストを実施
- [ ] 本番環境で動作確認

---

## 9. 参考資料

- つくおめの実装: `/root/tukuome3v2/lib/db.ts`
- Prismaスキーマ: `/root/myreno/prisma/schema.prisma`
- 現在の実装: `/root/myreno/lib/actions/recipes.ts`
- @vercel/postgresドキュメント: https://vercel.com/docs/storage/vercel-postgres

---

## 10. 推定作業時間

- **小規模チーム**: 1〜2日
- **個人作業**: 2〜3日

作業内容:
- `lib/db.ts`の作成: 4〜6時間
- `lib/actions/recipes.ts`の変更: 4〜6時間
- テストとデバッグ: 4〜6時間

