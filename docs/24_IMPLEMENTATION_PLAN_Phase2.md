# フェーズ2: レシピ一覧表示機能（基本）詳細プラン

## 1. 概要

### 1.1 目的
レシピ一覧を表示する基本機能を実装します。つくおめの実装を踏襲し、グリッドレイアウト、レスポンシブ対応、ページネーション機能を実装します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- フェーズ1.5が完了していること（ナビゲーションバー）

### 1.3 実装範囲
- レシピ一覧の表示（基本）
- レシピカードコンポーネント
- ページネーション（Load More方式）
- レスポンシブ対応

### 1.4 実装しない機能
- 検索・フィルタリング機能（フェーズ3で実装）
- レシピ操作モーダルダイアログ（フェーズ4で実装）

---

## 2. サーバーアクションの作成

### 2.1 ファイルの作成

`lib/actions/recipes.ts`を作成します。

### 2.2 実装内容

```typescript
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
```

### 2.3 実装のポイント

1. **認証チェック**: すべてのサーバーアクションで認証チェックを実施
2. **ユーザー別データの取得**: 評価（rank）、コメント、フォルダー登録状態を取得
3. **パフォーマンス**: バッチでユーザー情報を取得して効率化
4. **ページネーション**: `offset`と`limit`でページネーションを実装

---

## 3. レシピカードコンポーネントの作成

### 3.1 ファイルの作成

`app/components/RecipeCard.tsx`を作成します。

### 3.2 実装内容

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, MessageSquare } from "lucide-react";

type RecipeCardProps = {
  recipe: {
    recipeId: number;
    title: string;
    imageUrl: string | null;
    tsukurepoCount: number;
    rank: number; // 0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない
    comment: string | null;
    isInFolder: boolean;
  };
  onLikeClick: () => void;
  onCommentClick: () => void;
  onFolderClick: () => void;
};

export default function RecipeCard({
  recipe,
  onLikeClick,
  onCommentClick,
  onFolderClick,
}: RecipeCardProps) {
  // つくれぽ数をカンマ区切りでフォーマット
  const formatTsukurepoCount = (count: number) => {
    return count.toLocaleString("ja-JP") + " 件";
  };

  // いいねアイコンの色を決定
  const getHeartColor = () => {
    if (recipe.rank === 1) return { fill: "red", stroke: "red" };
    if (recipe.rank === 2) return { fill: "orange", stroke: "orange" };
    return { fill: "none", stroke: "currentColor" };
  };

  const heartColor = getHeartColor();

  return (
    <div className="border rounded-lg overflow-hidden shadow-lg flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* 画像とタイトル（クックパッドへのリンク） */}
      <Link
        href={`https://cookpad.com/jp/recipes/${recipe.recipeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col flex-grow"
      >
        <div className="relative w-full h-40">
          <Image
            src={recipe.imageUrl || "/no-image.png"}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
        </div>
        <div className="p-3 flex flex-col flex-grow">
          <h3 className="font-bold text-md mb-2 line-clamp-2">
            {recipe.title}
          </h3>
        </div>
      </Link>

      {/* 操作アイコンエリア */}
      <div className="p-3 flex justify-around items-center text-xl mt-auto border-t border-gray-200 dark:border-zinc-700">
        {/* つくれぽ数 */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatTsukurepoCount(recipe.tsukurepoCount)}
        </p>

        {/* いいねボタン */}
        <button
          onClick={onLikeClick}
          className="cursor-pointer hover:opacity-70 transition-opacity"
          aria-label="いいね"
        >
          <Heart
            fill={heartColor.fill}
            stroke={heartColor.stroke}
            className="w-5 h-5"
          />
        </button>

        {/* フォルダーボタン */}
        <button
          onClick={onFolderClick}
          className="cursor-pointer hover:opacity-70 transition-opacity"
          aria-label="フォルダー"
        >
          <Star
            fill={recipe.isInFolder ? "yellow" : "none"}
            stroke={recipe.isInFolder ? "black" : "currentColor"}
            className="w-5 h-5 dark:stroke-zinc-300"
          />
        </button>

        {/* コメントボタン */}
        <button
          onClick={onCommentClick}
          className={`cursor-pointer hover:opacity-70 transition-opacity ${
            recipe.comment ? "text-blue-500" : ""
          }`}
          aria-label="コメント"
        >
          <MessageSquare
            fill={recipe.comment ? "blue" : "none"}
            stroke={recipe.comment ? "blue" : "currentColor"}
            className="w-5 h-5"
          />
        </button>
      </div>
    </div>
  );
}
```

### 3.3 実装のポイント

1. **クックパッドへのリンク**: 画像とタイトルをクリックでクックパッドのレシピページに遷移
2. **セキュリティ**: `rel="noopener noreferrer"`を設定
3. **アイコンの状態表示**: 評価、コメント、フォルダー登録状態を視覚的に表示
4. **レスポンシブ**: 画像のサイズを`sizes`属性で最適化
5. **ダークモード対応**: ダークモードのスタイルを適用

---

## 4. レシピ一覧コンポーネント（Load More方式）

### 4.1 ファイルの作成

`app/components/RecipeListWithLoadMore.tsx`を作成します。

### 4.2 実装内容

```typescript
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import RecipeCard from "./RecipeCard";
import { getRecipes } from "@/lib/actions/recipes";

type Recipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  tsukurepoCount: number;
  rank: number;
  comment: string | null;
  isInFolder: boolean;
};

interface RecipeListWithLoadMoreProps {
  initialRecipes: Recipe[];
  initialHasMore: boolean;
}

const ITEMS_PER_PAGE = 12;

export default function RecipeListWithLoadMore({
  initialRecipes,
  initialHasMore,
}: RecipeListWithLoadMoreProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [offset, setOffset] = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMoreRecipes = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { recipes: newRecipes, hasMore: newHasMore } = await getRecipes(
        offset,
        ITEMS_PER_PAGE
      );
      setRecipes((prevRecipes) => [...prevRecipes, ...newRecipes]);
      setOffset((prevOffset) => prevOffset + newRecipes.length);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("レシピの読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [offset, hasMore, loading]);

  // Intersection Observer で自動的に「もっと見る」を実行
  useEffect(() => {
    const observerElement = loadMoreRef.current;
    if (!observerElement || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreRecipes();
        }
      },
      {
        root: null,
        rootMargin: "100px", // 100px手前で発火
        threshold: 0.1,
      }
    );

    observer.observe(observerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMoreRecipes]);

  const handleLikeClick = () => {
    // フェーズ4で実装
    console.log("いいねダイアログを開く（フェーズ4で実装）");
  };

  const handleCommentClick = () => {
    // フェーズ4で実装
    console.log("コメントダイアログを開く（フェーズ4で実装）");
  };

  const handleFolderClick = () => {
    // フェーズ4で実装
    console.log("フォルダーダイアログを開く（フェーズ4で実装）");
  };

  return (
    <div>
      {/* グリッドレイアウト */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.recipeId}
            recipe={recipe}
            onLikeClick={handleLikeClick}
            onCommentClick={handleCommentClick}
            onFolderClick={handleFolderClick}
          />
        ))}
      </div>

      {/* 読み込み中表示 */}
      {loading && (
        <div className="flex justify-center mt-8">
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      )}

      {/* Intersection Observer用の監視要素 */}
      {hasMore && <div ref={loadMoreRef} className="h-1 w-full" />}
    </div>
  );
}
```

### 4.3 実装のポイント

1. **無限スクロール**: Intersection Observerで自動的に次のページを読み込む
2. **レスポンシブグリッド**: Tailwind CSSのグリッドシステムを使用
   - スマホ: 2列（`grid-cols-2`）
   - タブレット: 3-4列（`sm:grid-cols-3 md:grid-cols-4`）
   - PC: 6列（`lg:grid-cols-6 xl:grid-cols-6`）
3. **ローディング状態**: 読み込み中はローディング表示
4. **エラーハンドリング**: try-catchでエラーを処理

---

## 5. レシピ一覧ページの実装

### 5.1 ファイルの更新

`app/recipes/page.tsx`を更新します。

### 5.2 実装内容

```typescript
import { getRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";

const ITEMS_PER_PAGE = 12;

export default async function RecipesPage() {
  const { recipes, hasMore } = await getRecipes(0, ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 pt-20">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
          レシピ一覧
        </h1>
        <RecipeListWithLoadMore
          initialRecipes={recipes}
          initialHasMore={hasMore}
        />
      </div>
    </div>
  );
}
```

### 5.3 実装のポイント

1. **Server Component**: サーバーサイドで初期データを取得
2. **パディング調整**: ナビゲーションバーの高さ（`pt-20`）を考慮
3. **レスポンシブ**: 最大幅を設定してレイアウトを調整

---

## 6. レスポンシブ対応の詳細

### 6.1 グリッドレイアウト

つくおめを踏襲したレスポンシブグリッド：

- **PC（lg以上）**: 6列×2行（12件）
- **iPad（md以上）**: 4列×3行（12件）
- **スマホ（sm以上）**: 3列×4行（12件）
- **最小（sm未満）**: 2列×6行（12件）

### 6.2 Tailwind CSSクラス

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
```

---

## 7. 画像のプレースホルダー

### 7.1 プレースホルダー画像の準備

画像がない場合のプレースホルダー画像を準備します。

`public/no-image.png`を配置するか、以下のようなSVGを使用：

```tsx
// 画像がない場合の処理
src={recipe.imageUrl || "/no-image.png"}
```

---

## 8. 動作確認

### 8.1 基本的な動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:3050/recipes`にアクセス

3. 以下の確認を行います：
   - レシピ一覧が正しく表示される
   - レシピカードに画像、タイトル、つくれぽ数が表示される
   - 画像・タイトルクリックでクックパッドのレシピページが開く（新しいタブ）
   - 無限スクロールが正常に動作する
   - レスポンシブデザインが正常に動作する

### 8.2 レスポンシブ確認

1. ブラウザの開発者ツールで画面サイズを変更
2. 以下の確認を行います：
   - PC: 6列表示
   - iPad: 4列表示
   - スマホ: 2-3列表示

### 8.3 ダークモード確認

1. ブラウザのダークモード設定を有効化
2. 以下の確認を行います：
   - レシピカードの背景色がダークモードに対応している
   - テキストの色が適切に表示されている

---

## 9. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] `lib/actions/recipes.ts`が作成されている
- [ ] `app/components/RecipeCard.tsx`が作成されている
- [ ] `app/components/RecipeListWithLoadMore.tsx`が作成されている
- [ ] `app/recipes/page.tsx`が更新されている
- [ ] レシピ一覧が正しく表示される
- [ ] ページネーションが正常に動作する（無限スクロール）
- [ ] 画像、タイトル、つくれぽ数が正しく表示される
- [ ] 画像・タイトルクリックでクックパッドのレシピページが開く
- [ ] レスポンシブデザインが正常に動作する
- [ ] ダークモードに対応している
- [ ] エラーが発生していない

---

## 10. 次のステップ

フェーズ2が完了したら、**フェーズ3: 検索・フィルタリング機能**に進みます。

---

## 11. 参考資料

- `docs/01_REQUIREMENTS.md` の5.1.1節（レシピ一覧表示）
- `docs/13_IMPLEMENTATION_PLAN.md` のフェーズ2節
- `/root/tukuome3v2/app/recipes/page.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/RecipeCard.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/RecipeListWithLoadMore.tsx`（つくおめの実装）

---

## 12. トラブルシューティング

### 12.1 よくあるエラーと対処法

**エラー: 認証が必要です**
- セッションが正しく取得できているか確認
- `getServerSession`が正しく動作しているか確認

**エラー: レシピが表示されない**
- データベースにレシピデータが存在するか確認
- `getRecipes`関数が正しく動作しているか確認

**エラー: 無限スクロールが動作しない**
- Intersection Observerが正しく設定されているか確認
- `loadMoreRef`が正しく設定されているか確認

**エラー: 画像が表示されない**
- 画像URLが正しいか確認
- プレースホルダー画像が存在するか確認

---

## 13. 更新履歴

- 2024-XX-XX: 初版作成

