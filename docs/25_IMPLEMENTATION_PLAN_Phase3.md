# フェーズ3: 検索・フィルタリング機能 詳細プラン

## 1. 概要

### 1.1 目的
レシピを検索・フィルタリングする機能を実装します。つくおめの実装を踏襲し、タイトル検索、レシピID検索、分類フィルタ、いいねフィルタを実装します。

**重要**: この実装には**DB層の実装が含まれます**。Prismaクエリを使用してデータベースレベルでフィルタリングを実行するため、UIだけでなく実際にフィルタリングが動作します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- フェーズ1.5が完了していること（ナビゲーションバー）
- フェーズ2が完了していること（レシピ一覧表示機能）

### 1.3 実装範囲
- タイトル検索（部分一致）**DB層で実装**
- レシピID検索（数値のみの入力でレシピID検索）**DB層で実装**
- 分類フィルタ（すべて/主菜/副菜/その他）**DB層で実装**
- いいねフィルタ（すべて/好き/まあまあ）**DB層で実装**
- フィルターコントロールコンポーネント（レスポンシブ対応、折りたたみ機能）
- URLクエリパラメータで検索条件を保持

**注意**: タグフィルタとソート機能は実装しません（レノちゃんでは不要）。

### 1.4 実装しない機能
- タグ検索（フェーズ6で実装）
- フォルダー検索（フェーズ5で実装）

---

## 2. サーバーアクションの拡張

### 2.1 ファイルの更新

`lib/actions/recipes.ts`を更新します。

### 2.2 実装内容

#### 2.2.1 検索・フィルタリング用の型定義

```typescript
export type SearchMode = 'all' | 'main_dish' | 'sub_dish' | 'others';
export type RankFilter = 'all' | '1' | '2';
```

#### 2.2.2 getFilteredRecipes関数の実装

```typescript
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
  const totalCount = await prisma.renoRecipe.count({ where });
  const hasMore = offset + limit < totalCount;

  return {
    recipes: filteredRecipes,
    hasMore,
  };
}
```

### 2.3 実装のポイント

1. **DB層での実装**: Prismaクエリを使用してデータベースレベルでフィルタリングを実行（UIだけでなく実際に動作）
2. **レシピID検索**: 数値のみの入力でレシピID検索を実行（DB層で`findUnique`を使用）
3. **タイトル検索**: 部分一致でタイトルを検索（DB層で`contains`を使用、大文字小文字を区別しない）
4. **分類フィルタ**: `isMainDish`と`isSubDish`で分類をフィルタリング（DB層で`where`条件を使用）
5. **いいねフィルタ**: ユーザー情報を取得した後にフィルタリング（rank=1またはrank=2）
6. **ソート**: つくれぽ数降順で固定（DB層で`orderBy`を使用）
7. **パフォーマンス**: バッチでユーザー情報を取得して効率化

---

## 3. フィルターコントロールコンポーネントの作成

### 3.1 ファイルの作成

以下のコンポーネントを作成します：
- `app/components/RecipeFilterControls.tsx`（メインコンポーネント）
- `app/components/SearchInput.tsx`（検索入力）
- `app/components/SearchModeMenu.tsx`（分類フィルタ）
- `app/components/RankFilterMenu.tsx`（いいねフィルタ）

**注意**: タグフィルタ（UntaggedFilterMenu）とソート（SortMenu）は実装しません。

### 3.2 RecipeFilterControls.tsxの実装

```typescript
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import SearchInput from "./SearchInput";
import SearchModeMenu from "./SearchModeMenu";
import RankFilterMenu from "./RankFilterMenu";

/**
 * レシピ検索・フィルタリングコントロールコンポーネント
 * レスポンシブ対応（PC: 常に表示、タブレット・スマホ: 折りたたみ表示）
 */
export default function RecipeFilterControls() {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchParams = useSearchParams();

  // 検索条件変更時に自動で折りたたむ
  useEffect(() => {
    setIsExpanded(false);
  }, [searchParams]);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-white dark:bg-zinc-900 shadow-md p-4 border-b border-gray-200 dark:border-zinc-700">
      {/* 折りたたみボタン（タブレット・スマホのみ） */}
      <div className="flex justify-end lg:hidden mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-md bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
          aria-label={isExpanded ? "フィルターを閉じる" : "フィルターを開く"}
        >
          {isExpanded ? (
            <ChevronUp size={24} className="text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown size={24} className="text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* フィルターコントロール */}
      <div
        className={`flex-col lg:flex-row items-center justify-between gap-2 ${
          isExpanded ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="w-full md:w-full lg:w-1/3">
          <SearchInput />
        </div>
        <div className="w-full md:w-full lg:w-1/3 border border-gray-300 dark:border-zinc-700 rounded-md p-2">
          <SearchModeMenu />
        </div>
        <div className="w-full md:w-full lg:w-1/3 border border-gray-300 dark:border-zinc-700 rounded-md p-2">
          <RankFilterMenu />
        </div>
      </div>
    </div>
  );
}
```

### 3.3 SearchInput.tsxの実装

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

/**
 * 検索入力コンポーネント
 * タイトル検索またはレシピID検索
 */
export default function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("title") || ""
  );

  // URLパラメータが変更されたときに検索文字列を更新
  useEffect(() => {
    setSearchTerm(searchParams.get("title") || "");
  }, [searchParams]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams.toString());
    
    if (value.trim()) {
      params.set("title", value.trim());
    } else {
      params.delete("title");
    }
    
    // レシピID検索の場合は他の検索条件をクリア
    if (/^[0-9]+$/.test(value.trim())) {
      params.delete("tag");
      params.delete("folder");
      params.set("mode", "all");
      params.set("rank", "all");
    }
    
    router.push(`/recipes?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(e.currentTarget.value);
    }
  };

  return (
    <Input
      type="text"
      placeholder="タイトル検索またはレシピID検索"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={(e) => handleSearch(e.target.value)}
      className="w-full"
    />
  );
}
```

### 3.4 SearchModeMenu.tsxの実装

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 分類フィルタメニューコンポーネント
 * すべて/主菜/副菜/その他
 */
export default function SearchModeMenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get("mode") || "all";

  const handleModeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mode", value);
    router.push(`/recipes?${params.toString()}`);
  };

  return (
    <Select value={currentMode} onValueChange={handleModeChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="分類" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">すべて</SelectItem>
        <SelectItem value="main_dish">主菜</SelectItem>
        <SelectItem value="sub_dish">副菜</SelectItem>
        <SelectItem value="others">その他</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### 3.5 RankFilterMenu.tsxの実装

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * いいねフィルタメニューコンポーネント
 * すべて/好き/まあまあ
 */
export default function RankFilterMenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRank = searchParams.get("rank") || "all";

  const handleRankChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rank", value);
    router.push(`/recipes?${params.toString()}`);
  };

  return (
    <Select value={currentRank} onValueChange={handleRankChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="いいね" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">すべて</SelectItem>
        <SelectItem value="1">好き</SelectItem>
        <SelectItem value="2">まあまあ</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

### 3.6 実装のポイント

1. **レスポンシブ対応**: PC（lg以上）は常に表示、タブレット・スマホ（lg未満）は折りたたみ表示
2. **URLクエリパラメータ**: 検索条件をURLクエリパラメータで保持
3. **レシピID検索**: 数値のみの入力でレシピID検索を実行（他の検索条件をクリア）
4. **ダークモード対応**: ダークモードのスタイルを適用
5. **shadcn/uiコンポーネント**: Selectコンポーネントを使用（フェーズ0で追加済み）

---

## 4. レシピ一覧ページの更新

### 4.1 ファイルの更新

`app/recipes/page.tsx`を更新します。

### 4.2 実装内容

```typescript
import { getFilteredRecipes } from "@/lib/actions/recipes";
import RecipeListWithLoadMore from "@/app/components/RecipeListWithLoadMore";
import RecipeFilterControls from "@/app/components/RecipeFilterControls";

interface RecipesPageProps {
  searchParams: Promise<{
    title?: string | string[] | null;
    mode?: string | string[] | null;
    tag?: string | string[] | null;
    folder?: string | string[] | null;
    rank?: string | string[] | null;
  }>;
}

const ITEMS_PER_PAGE = 12;

export default async function RecipesPage({
  searchParams,
}: RecipesPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // 検索パラメータを取得
  const searchTerm =
    Array.isArray(resolvedSearchParams?.title)
      ? resolvedSearchParams.title[0]
      : resolvedSearchParams?.title || "";

  // レシピID検索かどうかを判定
  const isIdSearch = /^[0-9]+$/.test(searchTerm);

  // レシピID検索の場合は他の検索条件を無視
  const searchMode = isIdSearch
    ? "all"
    : Array.isArray(resolvedSearchParams?.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams?.mode || "all";
  
  const searchTag = isIdSearch
    ? ""
    : Array.isArray(resolvedSearchParams?.tag)
    ? resolvedSearchParams.tag[0]
    : resolvedSearchParams?.tag || "";
  
  const folderName = isIdSearch
    ? ""
    : Array.isArray(resolvedSearchParams?.folder)
    ? resolvedSearchParams.folder[0]
    : resolvedSearchParams?.folder || "";
  
  const searchRank = isIdSearch
    ? "all"
    : Array.isArray(resolvedSearchParams?.rank)
    ? resolvedSearchParams.rank[0]
    : resolvedSearchParams?.rank || "all";

  // レシピを取得（DB層でフィルタリング）
  const { recipes: initialRecipes, hasMore: initialHasMore } =
    await getFilteredRecipes(
      0,
      ITEMS_PER_PAGE,
      searchTerm,
      searchMode,
      searchTag,
      folderName,
      searchRank
    );

  return (
    <>
      <RecipeFilterControls />
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 pt-[120px]">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
            レシピ一覧
          </h1>
          <RecipeListWithLoadMore
            key={`${searchTerm}-${searchMode}-${searchTag}-${searchRank}`}
            initialRecipes={initialRecipes}
            initialHasMore={initialHasMore}
            searchTerm={searchTerm}
            searchMode={searchMode}
            searchTag={searchTag}
            folderName={folderName}
            searchRank={searchRank}
          />
        </div>
      </div>
    </>
  );
}
```

### 4.3 実装のポイント

1. **URLクエリパラメータ**: `searchParams`から検索条件を取得
2. **レシピID検索**: 数値のみの入力でレシピID検索を実行（他の検索条件を無視）
3. **パディング調整**: フィルターコントロールの高さ（`pt-[120px]`）を考慮
4. **key属性**: 検索条件が変更されたときにコンポーネントを再マウント

---

## 5. RecipeListWithLoadMoreコンポーネントの更新

### 5.1 ファイルの更新

`app/components/RecipeListWithLoadMore.tsx`を更新します。

### 5.2 実装内容

```typescript
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import RecipeCard from "./RecipeCard";
import { getFilteredRecipes } from "@/lib/actions/recipes";

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
  searchTerm?: string;
  searchMode?: string;
  searchTag?: string;
  folderName?: string;
  searchRank?: string;
}

const ITEMS_PER_PAGE = 12;

export default function RecipeListWithLoadMore({
  initialRecipes,
  initialHasMore,
  searchTerm = "",
  searchMode = "all",
  searchTag = "",
  folderName = "",
  searchRank = "all",
}: RecipeListWithLoadMoreProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [offset, setOffset] = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 検索条件が変更されたときにリセット
  useEffect(() => {
    setRecipes(initialRecipes);
    setOffset(initialRecipes.length);
    setHasMore(initialHasMore);
  }, [initialRecipes, initialHasMore]);

  const loadMoreRecipes = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { recipes: newRecipes, hasMore: newHasMore } =
        await getFilteredRecipes(
          offset,
          ITEMS_PER_PAGE,
          searchTerm,
          searchMode,
          searchTag,
          folderName,
          searchRank
        );
      setRecipes((prevRecipes) => [...prevRecipes, ...newRecipes]);
      setOffset((prevOffset) => prevOffset + newRecipes.length);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("レシピの読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [
    offset,
    hasMore,
    loading,
    searchTerm,
    searchMode,
    searchTag,
    folderName,
    searchRank,
  ]);

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
        rootMargin: "100px",
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

### 5.3 実装のポイント

1. **検索条件の受け取り**: 検索条件をpropsで受け取る
2. **検索条件変更時のリセット**: 検索条件が変更されたときにレシピ一覧をリセット
3. **無限スクロール**: 検索条件を考慮して次のページを読み込む

---

## 6. shadcn/uiコンポーネントの確認

### 6.1 Selectコンポーネント

既に追加済みのため、追加不要です。

### 6.2 Inputコンポーネント

フェーズ0で追加済みのため、追加不要です。

---

## 7. レスポンシブ対応の詳細

### 7.1 フィルターコントロールのレスポンシブ

- **PC（lg以上）**: 常に表示（`lg:flex`）
- **タブレット・スマホ（lg未満）**: 折りたたみ表示（`hidden lg:flex`）
- **折りたたみボタン**: ChevronDown/ChevronUpアイコン（lucide-react）

### 7.2 レイアウトの調整

- **固定ヘッダー**: `fixed top-16`でナビゲーションバーの下に配置
- **z-index**: `z-40`で他の要素の上に表示
- **パディング**: コンテンツエリアのパディングを調整（`pt-[120px]`）

---

## 8. URLクエリパラメータの仕様

### 8.1 パラメータ一覧

- `title`: 検索文字列（タイトル検索またはレシピID検索）
- `mode`: 分類フィルタ（`all`, `main_dish`, `sub_dish`, `others`）
- `tag`: タグ名（フェーズ6で使用）
- `folder`: フォルダー名（フェーズ5で使用）
- `rank`: いいねフィルタ（`all`, `1`, `2`）

### 8.2 レシピID検索時の動作

レシピID検索（数値のみの入力）の場合：
- 他の検索条件（`tag`, `folder`, `mode`, `rank`）を無視
- URLパラメータから削除または`all`に設定

---

## 9. 動作確認

### 9.1 基本的な動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:3050/recipes`にアクセス

3. 以下の確認を行います：
   - フィルターコントロールが表示される
   - タイトル検索が正常に動作する（DB層でフィルタリング）
   - レシピID検索が正常に動作する（DB層で検索）
   - 分類フィルタが正常に動作する（DB層でフィルタリング）
   - いいねフィルタが正常に動作する（DB層でフィルタリング）
   - URLクエリパラメータで検索条件が保持される
   - 無限スクロールが正常に動作する

### 9.2 レスポンシブ確認

1. ブラウザの開発者ツールで画面サイズを変更

2. 以下の確認を行います：
   - PC: フィルターコントロールが常に表示される
   - タブレット・スマホ: フィルターコントロールが折りたたみ表示される
   - 折りたたみボタンが正常に動作する

### 9.3 ダークモード確認

1. ブラウザのダークモード設定を有効化

2. 以下の確認を行います：
   - フィルターコントロールの背景色がダークモードに対応している
   - テキストの色が適切に表示されている

---

## 10. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] `lib/actions/recipes.ts`に`getFilteredRecipes`関数が実装されている
- [ ] `app/components/RecipeFilterControls.tsx`が作成されている
- [ ] `app/components/SearchInput.tsx`が作成されている
- [ ] `app/components/SearchModeMenu.tsx`が作成されている
- [ ] `app/components/RankFilterMenu.tsx`が作成されている
- [ ] `app/recipes/page.tsx`が更新されている
- [ ] `app/components/RecipeListWithLoadMore.tsx`が更新されている
- [ ] タイトル検索が正常に動作する（DB層でフィルタリング）
- [ ] レシピID検索が正常に動作する（DB層で検索）
- [ ] 分類フィルタが正常に動作する（DB層でフィルタリング）
- [ ] いいねフィルタが正常に動作する（DB層でフィルタリング）
- [ ] URLクエリパラメータで検索条件が保持される
- [ ] レスポンシブデザインが正常に動作する
- [ ] ダークモードに対応している
- [ ] エラーが発生していない

---

## 11. 次のステップ

フェーズ3が完了したら、**フェーズ4: レシピ操作モーダルダイアログ（いいね・コメント・フォルダー機能）**に進みます。

---

## 12. 参考資料

- `docs/01_REQUIREMENTS.md` の5.2節（検索・フィルタリング機能）
- `docs/13_IMPLEMENTATION_PLAN.md` のフェーズ3節
- `/root/tukuome3v2/app/recipes/page.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/RecipeFilterControls.tsx`（つくおめの実装）
- `/root/tukuome3v2/lib/services.ts`（つくおめの実装）

---

## 13. トラブルシューティング

### 13.1 よくあるエラーと対処法

**エラー: 認証が必要です**
- セッションが正しく取得できているか確認
- `getServerSession`が正しく動作しているか確認

**エラー: 検索結果が表示されない**
- データベースにレシピデータが存在するか確認
- `getFilteredRecipes`関数が正しく動作しているか確認
- 検索条件が正しく渡されているか確認

**エラー: URLクエリパラメータが保持されない**
- `useSearchParams`が正しく動作しているか確認
- `router.push`が正しく動作しているか確認

**エラー: フィルターコントロールが表示されない**
- `RecipeFilterControls`コンポーネントが正しくインポートされているか確認
- z-indexが正しく設定されているか確認

**エラー: Selectコンポーネントが表示されない**
- shadcn/uiのSelectコンポーネントが追加されているか確認
- `components/ui/select.tsx`が存在するか確認

---

## 14. 更新履歴

- 2024-XX-XX: 初版作成

