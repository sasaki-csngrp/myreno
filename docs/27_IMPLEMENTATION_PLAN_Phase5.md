# フェーズ5: フォルダー機能詳細プラン

## 1. 概要

### 1.1 目的
ユーザー別のフォルダー機能を実装します。フォルダー一覧ページ、フォルダー内レシピ一覧ページ、およびフォルダー一覧取得（サムネイル画像付き）のサーバーアクションを実装します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- フェーズ1.5が完了していること（ナビゲーションバー）
- フェーズ2が完了していること（レシピ一覧表示機能）
- フェーズ3が完了していること（検索・フィルタリング機能）
- フェーズ4が完了していること（レシピ操作モーダルダイアログ）

### 1.3 実装範囲
- フォルダー一覧ページ（`app/recipes/folders/page.tsx`）
- フォルダー内レシピ一覧ページ（`app/recipes/folders/[folderName]/page.tsx`）
- サーバーアクション（`fetchFoldersWithImages`, `getRecipesByFolder`）
- フォルダーカードコンポーネント（`app/components/FolderCard.tsx`）

### 1.4 実装しない機能
- フォルダー作成・削除機能（フェーズ4で実装済み）
- レシピをフォルダーに追加/削除（フェーズ4で実装済み）

---

## 2. サーバーアクションの実装

### 2.1 ファイルの更新

`lib/actions/recipes.ts`を更新します。

### 2.2 実装内容

#### 2.2.1 fetchFoldersWithImages関数の実装

```typescript
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
```

#### 2.2.2 getRecipesByFolder関数の実装

```typescript
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
  const userId = session.user.id;
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
```

---

## 3. コンポーネントの実装

### 3.1 FolderCardコンポーネントの作成

`app/components/FolderCard.tsx`を作成します。

#### 3.1.1 実装内容

```typescript
"use client";

import Link from "next/link";
import Image from "next/image";

interface FolderCardProps {
  folderName: string;
  images: string[];
}

export default function FolderCard({ folderName, images }: FolderCardProps) {
  return (
    <Link href={`/recipes/folders/${encodeURIComponent(folderName)}`}>
      <div className="border rounded-lg overflow-hidden shadow-lg h-full flex flex-col hover:shadow-xl transition-shadow">
        <div className="p-4">
          <h2 className="text-xl font-bold">{folderName}</h2>
        </div>
        <div className="grid grid-cols-2 gap-1 flex-grow p-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="relative h-24 bg-gray-200 flex items-center justify-center rounded-md"
            >
              {images[index] ? (
                <Image
                  src={images[index]}
                  alt={`${folderName} recipe image ${index + 1}`}
                  fill
                  className="object-cover rounded-md"
                />
              ) : (
                <span className="text-gray-500 text-xs">No Image</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
```

#### 3.1.2 実装のポイント

- フォルダー名とサムネイル画像4枚を表示
- クリックでフォルダー内レシピ一覧ページに遷移
- レスポンシブ対応（グリッドレイアウト）
- 画像がない場合は "No Image" を表示

---

## 4. ページの実装

### 4.1 フォルダー一覧ページの実装

`app/recipes/folders/page.tsx`を作成します。

#### 4.1.1 実装内容

```typescript
import { fetchFoldersWithImages } from "@/lib/actions/recipes";
import FolderCard from "@/app/components/FolderCard";

export default async function FoldersPage() {
  const folders = await fetchFoldersWithImages();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">フォルダー一覧</h1>
      {folders.length === 0 ? (
        <p className="text-gray-500">フォルダーがありません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <FolderCard
              key={folder.foldername}
              folderName={folder.foldername}
              images={folder.images}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 4.1.2 実装のポイント

- サーバーコンポーネントとして実装
- グリッドレイアウトでフォルダーカードを表示
- レスポンシブ対応（つくおめを踏襲）:
  - PC: 6列（xl:grid-cols-6）
  - タブレット: 4列（md:grid-cols-4）
  - スマホ: 2列（grid-cols-2）
- フォルダーが0件の場合はメッセージを表示

### 4.2 フォルダー内レシピ一覧ページの実装

`app/recipes/folders/[folderName]/page.tsx`を作成します。

#### 4.2.1 実装内容

```typescript
import { getRecipesByFolder } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import { notFound } from "next/navigation";

interface FolderRecipesPageProps {
  params: {
    folderName: string;
  };
}

export default async function FolderRecipesPage({
  params,
}: FolderRecipesPageProps) {
  const folderName = decodeURIComponent(params.folderName);

  try {
    const { recipes, hasMore } = await getRecipesByFolder(folderName, 0, 12);

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">フォルダー: {folderName}</h1>
        {recipes.length === 0 ? (
          <p className="text-gray-500">このフォルダーにはレシピがありません</p>
        ) : (
          <RecipeListWithLoadMore
            initialRecipes={recipes}
            initialHasMore={hasMore}
            folderName={folderName}
          />
        )}
      </div>
    );
  } catch (error) {
    // フォルダーが見つからない場合は404を返す
    if (error instanceof Error && error.message === "フォルダーが見つかりません") {
      notFound();
    }
    throw error;
  }
}
```

#### 4.2.2 実装のポイント

- サーバーコンポーネントとして実装
- フォルダー名をURLパラメータから取得（URLデコード）
- フォルダーが見つからない場合は404を返す
- `RecipeListWithLoadMore`コンポーネントを使用（フェーズ2で実装済み）
- レシピが0件の場合はメッセージを表示

### 4.3 RecipeListWithLoadMoreコンポーネントの拡張

`app/components/RecipeListWithLoadMore.tsx`を更新して、フォルダー名パラメータに対応します。

#### 4.3.1 実装内容

```typescript
// 既存のRecipeListWithLoadMoreコンポーネントに以下を追加

interface RecipeListWithLoadMoreProps {
  initialRecipes: RecipeWithUserData[];
  initialHasMore: boolean;
  folderName?: string; // フォルダー名（オプション）
  // ... 既存のprops
}

// loadMore関数内で、folderNameが指定されている場合はgetRecipesByFolderを呼び出す
const loadMore = async () => {
  if (folderName) {
    const result = await getRecipesByFolder(
      folderName,
      recipes.length,
      12
    );
    setRecipes((prev) => [...prev, ...result.recipes]);
    setHasMore(result.hasMore);
  } else {
    // 既存のロジック（通常のレシピ一覧）
    // ...
  }
};
```

---

## 5. ナビゲーションバーの更新

### 5.1 フォルダーメニュー項目の追加

`app/components/NavigationBar.tsx`を確認し、フォルダーメニュー項目が正しく実装されていることを確認します。

#### 5.1.1 確認事項

- フォルダーメニュー項目が存在する
- クリックで`/recipes/folders`に遷移する
- レスポンシブ対応（モバイルでハンバーガーメニュー）

---

## 6. 実装手順

### ステップ1: サーバーアクションの実装

1. `lib/actions/recipes.ts`を開く
2. `fetchFoldersWithImages`関数を追加
3. `getRecipesByFolder`関数を追加
4. 動作確認（型エラーがないことを確認）

### ステップ2: FolderCardコンポーネントの作成

1. `app/components/FolderCard.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（型エラーがないことを確認）

### ステップ3: フォルダー一覧ページの実装

1. `app/recipes/folders/page.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（フォルダー一覧が表示されることを確認）

### ステップ4: フォルダー内レシピ一覧ページの実装

1. `app/recipes/folders/[folderName]/page.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（フォルダー内レシピ一覧が表示されることを確認）

### ステップ5: RecipeListWithLoadMoreコンポーネントの拡張

1. `app/components/RecipeListWithLoadMore.tsx`を開く
2. `folderName`プロパティを追加
3. `loadMore`関数を更新（フォルダー名が指定されている場合は`getRecipesByFolder`を呼び出す）
4. 動作確認（フォルダー内レシピ一覧でページネーションが動作することを確認）

### ステップ6: 統合テスト

1. フォルダー一覧ページにアクセス
2. フォルダーカードをクリックしてフォルダー内レシピ一覧に遷移
3. フォルダー内レシピ一覧でページネーションが動作することを確認
4. ナビゲーションバーからフォルダーメニューにアクセスできることを確認

---

## 7. テスト項目

### 7.1 フォルダー一覧ページ

- [ ] フォルダー一覧が正しく表示される
- [ ] サムネイル画像4枚が正しく表示される（画像がある場合）
- [ ] 画像がない場合は "No Image" が表示される
- [ ] フォルダーカードをクリックでフォルダー内レシピ一覧に遷移する
- [ ] フォルダーが0件の場合はメッセージが表示される
- [ ] レスポンシブデザインが正常に動作する

### 7.2 フォルダー内レシピ一覧ページ

- [ ] フォルダー内のレシピ一覧が正しく表示される
- [ ] フォルダー名が正しく表示される
- [ ] ページネーションが正常に動作する
- [ ] レシピが0件の場合はメッセージが表示される
- [ ] 存在しないフォルダーにアクセスした場合は404が返される
- [ ] レシピカードの操作（いいね・コメント・フォルダー）が正常に動作する

### 7.3 サーバーアクション

- [ ] `fetchFoldersWithImages`が正しく動作する
- [ ] `getRecipesByFolder`が正しく動作する
- [ ] 認証チェックが正しく動作する（未認証の場合はエラー）
- [ ] ユーザー別データが正しくフィルタリングされる

---

## 8. 参考資料

### 8.1 つくおめの実装

- `/root/tukuome3v2/app/recipes/folders/page.tsx`: フォルダー一覧ページ
- `/root/tukuome3v2/lib/db.ts`: `getFoldersWithImages`関数（640-657行目）
- `/root/tukuome3v2/lib/services.ts`: `fetchFoldersWithImages`関数（274-277行目）

### 8.2 レノちゃんの実装

- `docs/13_IMPLEMENTATION_PLAN.md`: フェーズ5の概要
- `docs/02_SOLUTION_DESIGN.md`: データベーススキーマ（4.1.2節）
- `docs/26_IMPLEMENTATION_PLAN_Phase4.md`: フェーズ4の実装計画（フォルダー設定モーダルダイアログ）

---

## 9. 注意事項

### 9.1 データベーススキーマ

- `reno_user_folders`テーブルの`idOfRecipes`カラムはスペース区切り文字列
- レシピIDは整数型（`recipe_id`は`INTEGER`型）
- フォルダー名はユーザー別にユニーク（`userId_folderName`のユニーク制約）

### 9.2 パフォーマンス

- フォルダー一覧ページでは、各フォルダーのサムネイル画像を取得するため、N+1クエリが発生する可能性がある
- 必要に応じて、バッチ処理やJOINクエリで最適化を検討

### 9.3 セキュリティ

- すべてのサーバーアクションで認証チェックを実施
- ユーザーIDでデータをフィルタリング（ユーザー別データ）
- フォルダー名のURLエンコード/デコードを正しく処理

### 9.4 エラーハンドリング

- フォルダーが見つからない場合は404を返す
- 認証エラーの場合は適切なエラーメッセージを返す
- データベースエラーの場合は適切にハンドリング

---

## 10. 完了条件

- [ ] フォルダー一覧ページが正しく表示される
- [ ] フォルダー内レシピ一覧ページが正しく表示される
- [ ] ページネーションが正常に動作する
- [ ] すべてのテスト項目がパスする
- [ ] レスポンシブデザインが正常に動作する
- [ ] エラーハンドリングが適切に実装されている

---

## 11. 更新履歴

- 2025-01-XX: 初版作成

