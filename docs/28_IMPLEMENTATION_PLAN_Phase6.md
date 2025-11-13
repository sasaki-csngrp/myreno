# フェーズ6: タグ検索機能詳細プラン

## 1. 概要

### 1.1 目的
階層構造を持つタグからレシピを検索する機能を実装します。つくおめの実装を踏襲し、タグ検索ページ、階層ナビゲーション、タグカードコンポーネントを実装します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- フェーズ1.5が完了していること（ナビゲーションバー）
- フェーズ2が完了していること（レシピ一覧表示機能）
- フェーズ3が完了していること（検索・フィルタリング機能）
- フェーズ4が完了していること（レシピ操作モーダルダイアログ）
- フェーズ5が完了していること（フォルダー機能）

### 1.3 実装範囲
- タグ検索ページ（`app/recipes/tags/page.tsx`）
- 階層ナビゲーション機能（大タグ → 中タグ → 小タグ → 極小タグ）
- タグカードコンポーネント（`app/components/TagCard.tsx`）
- タグリストコンポーネント（`app/components/TagsList.tsx`）
- サーバーアクション（`getTagsByLevel`, `getRecipesByTag`）

### 1.4 実装しない機能
- タグメンテナンス機能（管理機能のため、つくおめ側で実施）
- タグの追加・編集・削除（管理機能のため、つくおめ側で実施）

---

## 2. サーバーアクションの実装

### 2.1 ファイルの更新

`lib/actions/recipes.ts`を更新します。

### 2.2 実装内容

#### 2.2.1 getTagsByLevel関数の実装

```typescript
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
      dispname: "asc",
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
          const recipeCount = await getRecipeCountByTag(tag.name);
          hasChildren = recipeCount > 0 ? `${recipeCount} 件` : "0 件";
        }
      } else {
        // 極小タグの場合はレシピ数のみ
        const recipeCount = await getRecipeCountByTag(tag.name);
        hasChildren = recipeCount > 0 ? `${recipeCount} 件` : "0 件";
      }

      return {
        tagId: tag.tagId,
        dispname: tag.dispname || "",
        name: tag.name || "",
        imageUri: tag.imageUri || null,
        hasImageUri: tag.imageUri ? true : false,
        hasChildren,
      };
    })
  );

  return tagsWithCounts;
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
```

#### 2.2.2 getRecipesByTag関数の実装

```typescript
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
```

### 2.3 実装のポイント

1. **階層ナビゲーション**: 親タグ名に基づいて子タグをフィルタリング
2. **タグマスタは全ユーザー共通**: 認証チェックは不要
3. **レシピとタグの関連**: `reno_recipes.tag`カラム（スペース区切り文字列）から正確にタグ名を抽出
4. **子タグ数/レシピ数の表示**: 子タグがある場合は "▼"、ない場合は "X 件" を表示

---

## 3. コンポーネントの実装

### 3.1 TagCardコンポーネントの作成

`app/components/TagCard.tsx`を作成します。

#### 3.1.1 実装内容

```typescript
"use client";

import Image from "next/image";

export type TagData = {
  tagId: number;
  dispname: string;
  name: string;
  imageUri: string | null;
  hasImageUri: boolean;
  hasChildren: string; // "▼" または "X 件" 形式
};

interface TagCardProps {
  tag: TagData;
  onClick: (tag: TagData) => void;
}

export default function TagCard({ tag, onClick }: TagCardProps) {
  const hasImage = tag.hasImageUri;

  return (
    <div
      className="relative flex items-center justify-center w-full aspect-square rounded-lg overflow-hidden shadow-lg cursor-pointer bg-white dark:bg-zinc-800 hover:shadow-xl transition-shadow"
      onClick={() => onClick(tag)}
    >
      {/* レイヤー1: 背景画像 */}
      {hasImage && tag.imageUri && (
        <Image
          src={tag.imageUri}
          alt={tag.dispname}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
        />
      )}

      {/* レイヤー2: 半透明オーバーレイ (画像がある時のみ) */}
      {hasImage && <div className="absolute inset-0 bg-black/30"></div>}

      {/* レイヤー3: テキストコンテンツ (常に最前面) */}
      <div className="relative z-10 text-center px-2">
        <div
          className={`text-2xl font-bold ${
            hasImage ? "text-white" : "text-black dark:text-white"
          }`}
        >
          {tag.dispname}
        </div>
      </div>

      {/* 右下の件数表示 (常に最前面) */}
      {tag.hasChildren && (
        <div className="absolute z-10 bottom-2 right-2 bg-gray-800/75 text-white text-sm px-2 py-1 rounded">
          {tag.hasChildren}
        </div>
      )}
    </div>
  );
}
```

#### 3.1.2 実装のポイント

- タグ画像、表示名、子タグ数/レシピ数を表示
- クリックでタグを選択（階層ナビゲーションまたはレシピ検索）
- レスポンシブ対応（アスペクト比1:1）
- ダークモード対応

---

### 3.2 TagsListコンポーネントの作成

`app/components/TagsList.tsx`を作成します。

#### 3.2.1 実装内容

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TagCard, { TagData } from "./TagCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getTagsByLevel } from "@/lib/actions/recipes";

type TagsListProps = {
  initialTags: TagData[];
};

export default function TagsList({ initialTags }: TagsListProps) {
  const router = useRouter();
  const [tags, setTags] = useState<TagData[]>(initialTags);
  const [path, setPath] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (path.length > 0) {
      const fetchTags = async () => {
        setIsLoading(true);
        const currentLevel = path.length;
        const currentValue = path[path.length - 1];
        const newTags = await getTagsByLevel(currentLevel, currentValue);
        setTags(newTags);
        setIsLoading(false);
      };
      fetchTags();
    } else {
      setTags(initialTags);
    }
  }, [path, initialTags]);

  const handleTagClick = (tag: TagData) => {
    if (tag.hasChildren === "▼") {
      // 子タグがある場合は階層を進む
      setPath((prevPath) => [...prevPath, tag.name]);
    } else {
      // 子タグがない場合はレシピ検索ページに遷移
      router.push(`/recipes?tag=${encodeURIComponent(tag.name)}`);
    }
  };

  const handleGoBack = () => {
    setPath((prevPath) => prevPath.slice(0, -1));
  };

  // タグ検索画面で「素材別」を「食材」に置き換える（つくおめを踏襲）
  const getDisplayName = (dispname: string) => {
    return dispname === "素材別" ? "食材" : dispname;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-2">
      {isLoading ? (
        [...Array(12)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))
      ) : (
        <>
          {tags
            .filter((tag) => {
              // 子タグがある場合は表示
              if (tag.hasChildren === "▼") {
                return true;
              }
              // レシピ件数を抽出（"X 件"形式から数値を取得）
              const match = tag.hasChildren.match(/^(\d+)\s*件$/);
              if (match) {
                const recipeCount = parseInt(match[1], 10);
                return recipeCount > 0;
              }
              return false;
            })
            .map((tag) => {
              // 表示用に「素材別」を「食材」に置き換えたタグを作成
              const displayTag = {
                ...tag,
                dispname: getDisplayName(tag.dispname),
              };
              return (
                <TagCard
                  key={tag.tagId}
                  tag={displayTag}
                  onClick={handleTagClick}
                />
              );
            })}

          {path.length > 0 && (
            <TagCard
              key="back-button"
              tag={{
                tagId: -1, // ユニークな固定値
                dispname: "↩️ 前に戻る",
                name: "back",
                imageUri: null,
                hasImageUri: false,
                hasChildren: "",
              }}
              onClick={() => handleGoBack()}
            />
          )}
        </>
      )}
    </div>
  );
}
```

#### 3.2.2 実装のポイント

- 階層ナビゲーション: パス（path）を管理して階層を進む/戻る
- 子タグがある場合は階層を進む、ない場合はレシピ検索ページに遷移
- レシピ数が0件のタグは非表示
- ローディング状態の表示（Skeletonコンポーネント）
- レスポンシブ対応（グリッドレイアウト）

---

## 4. ページの実装

### 4.1 タグ検索ページの実装

`app/recipes/tags/page.tsx`を作成します。

#### 4.1.1 実装内容

```typescript
import { getTagsByLevel } from "@/lib/actions/recipes";
import TagsList from "@/app/components/TagsList";

export default async function TagsPage() {
  // 大タグ（level=0）を取得
  const initialTags = await getTagsByLevel(0, "");

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">タグから探す</h1>
      <TagsList initialTags={initialTags} />
    </div>
  );
}
```

#### 4.1.2 実装のポイント

- サーバーコンポーネントとして実装
- 大タグ（level=0）を初期表示
- TagsListコンポーネントを使用

---

## 5. レシピ一覧ページの拡張

### 5.1 タグフィルタの対応

`app/recipes/page.tsx`と`app/components/RecipeFilterControls.tsx`は既にタグフィルタに対応しているため、変更は不要です。

ただし、`getFilteredRecipes`関数がタグ名でフィルタリングできることを確認してください。

---

## 6. ナビゲーションバーの確認

### 6.1 タグ検索メニュー項目の確認

`app/components/NavigationBar.tsx`を確認し、タグ検索メニュー項目が正しく実装されていることを確認します。

#### 6.1.1 確認事項

- タグ検索メニュー項目が存在する
- クリックで`/recipes/tags`に遷移する
- レスポンシブ対応（モバイルでハンバーガーメニュー）

---

## 7. 実装手順

### ステップ1: サーバーアクションの実装

1. `lib/actions/recipes.ts`を開く
2. `getTagsByLevel`関数を追加
3. `getRecipeCountByTag`ヘルパー関数を追加
4. `getRecipesByTag`関数を追加（既に実装されている場合は確認）
5. 動作確認（型エラーがないことを確認）

### ステップ2: TagCardコンポーネントの作成

1. `app/components/TagCard.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（型エラーがないことを確認）

### ステップ3: TagsListコンポーネントの作成

1. `app/components/TagsList.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（型エラーがないことを確認）

### ステップ4: タグ検索ページの実装

1. `app/recipes/tags/page.tsx`を作成
2. 上記の実装内容をコピー
3. 動作確認（タグ検索ページが表示されることを確認）

### ステップ5: 統合テスト

1. タグ検索ページにアクセス
2. 大タグ一覧が表示されることを確認
3. タグをクリックして階層を進む
4. 子タグがないタグをクリックしてレシピ検索ページに遷移
5. レシピ一覧にタグフィルタが適用されていることを確認
6. ナビゲーションバーからタグ検索メニューにアクセスできることを確認

---

## 8. テスト項目

### 8.1 タグ検索ページ

- [ ] 大タグ一覧が正しく表示される
- [ ] タグカードの画像、表示名、件数が正しく表示される
- [ ] 子タグがあるタグをクリックで階層を進む
- [ ] 子タグがないタグをクリックでレシピ検索ページに遷移
- [ ] 「前に戻る」ボタンで階層を戻る
- [ ] レシピ数が0件のタグは非表示
- [ ] ローディング状態が正しく表示される
- [ ] レスポンシブデザインが正常に動作する

### 8.2 階層ナビゲーション

- [ ] 大タグ → 中タグ → 小タグ → 極小タグの階層が正しく動作する
- [ ] 各階層で正しいタグが表示される
- [ ] 階層を進む/戻るが正常に動作する

### 8.3 タグからレシピ検索

- [ ] タグをクリックでレシピ一覧ページに遷移
- [ ] レシピ一覧にタグフィルタが適用されている
- [ ] タグフィルタが適用されたレシピ一覧が正しく表示される
- [ ] ページネーションが正常に動作する

### 8.4 サーバーアクション

- [ ] `getTagsByLevel`が正しく動作する
- [ ] `getRecipesByTag`が正しく動作する
- [ ] タグマスタは全ユーザー共通で取得される
- [ ] レシピとタグの関連が正しく取得される

---

## 9. 参考資料

### 9.1 つくおめの実装

- `/root/tukuome3v2/app/recipes/tags/page.tsx`: タグ検索ページ
- `/root/tukuome3v2/app/components/TagsList.tsx`: タグリストコンポーネント
- `/root/tukuome3v2/app/components/TagCard.tsx`: タグカードコンポーネント
- `/root/tukuome3v2/lib/services.ts`: `getDispTags`関数
- `/root/tukuome3v2/lib/db.ts`: `getDispTagsOptimized`関数

### 9.2 レノちゃんの実装

- `docs/13_IMPLEMENTATION_PLAN.md`: フェーズ6の概要
- `docs/02_SOLUTION_DESIGN.md`: データベーススキーマ（4.1.1節）
- `docs/01_REQUIREMENTS.md`: タグ管理機能（5.3節）

---

## 10. 注意事項

### 10.1 データベーススキーマ

- `reno_tag_master`テーブルは全ユーザー共通（`userid`カラムなし）
- レシピとタグの関連は`reno_recipes.tag`カラム（スペース区切り文字列）で管理
- タグの階層構造は`l`, `m`, `s`, `ss`カラムで管理

### 10.2 パフォーマンス

- タグ一覧取得時に子タグ数/レシピ数を取得するため、N+1クエリが発生する可能性がある
- 必要に応じて、バッチ処理やJOINクエリで最適化を検討
- タグマスタは変更頻度が低いため、キャッシュを検討

### 10.3 セキュリティ

- タグマスタは全ユーザー共通のため、認証チェックは不要
- レシピ検索時は認証チェックを実施
- ユーザーIDでデータをフィルタリング（ユーザー別データ）

### 10.4 エラーハンドリング

- タグが見つからない場合は空配列を返す
- レシピ検索時の認証エラーは適切にハンドリング
- データベースエラーの場合は適切にハンドリング

### 10.5 UI/UX

- つくおめのUIを参考にするが、ユーザー向けに簡略化
- レスポンシブデザインを考慮
- ダークモード対応（既存の実装に合わせる）
- 「素材別」を「食材」に置き換える（つくおめを踏襲）

---

## 11. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] `lib/actions/recipes.ts`に`getTagsByLevel`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`getRecipesByTag`関数が実装されている
- [ ] `app/components/TagCard.tsx`が作成されている
- [ ] `app/components/TagsList.tsx`が作成されている
- [ ] `app/recipes/tags/page.tsx`が作成されている
- [ ] タグ検索ページが正しく表示される
- [ ] 階層ナビゲーションが正常に動作する
- [ ] タグからレシピ検索が正常に動作する
- [ ] すべてのテスト項目がパスする
- [ ] レスポンシブデザインが正常に動作する
- [ ] エラーハンドリングが適切に実装されている

---

## 12. 更新履歴

- 2025-01-XX: 初版作成

