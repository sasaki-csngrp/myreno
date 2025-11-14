# lib/db.ts リファクタリング計画

## 現状分析

`lib/db.ts`は701行の単一ファイルで、以下の責任が混在しています：

1. **レシピ検索・取得** (約300行)
   - `getRecipes()` - レシピ一覧取得
   - `getRecipesByTitle()` - タイトル検索
   - `getRecipesByTag()` - タグ検索
   - `getRecipesByFolder()` - フォルダー内レシピ取得
   - `getRecipeById()` - レシピID検索

2. **ユーザー設定・更新** (約60行)
   - `updateRank()` - いいね状態更新
   - `updateComment()` - コメント更新

3. **タグ関連** (約180行)
   - `getTagsByLevel()` - レベル別タグ取得
   - `getTagByName()` - タグ名からタグ情報取得
   - `getTagNameByHierarchy()` - 階層値からタグ名取得
   - `getRecipeCountByTag()` - タグ別レシピ数取得

4. **フォルダー関連** (約100行)
   - `isRecipeInFolder()` - フォルダー登録確認
   - `addRecipeToFolder()` - レシピをフォルダーに追加
   - `removeRecipeFromFolder()` - レシピをフォルダーから削除

5. **ヘルパー関数** (約20行)
   - `getModeWhereClause()` - 分類フィルタのWHERE句生成
   - `getRankWhereClause()` - いいねフィルタのWHERE句生成

## 分割案

責任の分離原則に従い、以下のように分割します：

```
lib/db/
├── index.ts                    # 全関数を再エクスポート（後方互換性のため）
├── helpers/
│   └── query-builders.ts       # クエリビルダーヘルパー関数
├── recipes.ts                  # レシピ検索・取得関連
├── user-preferences.ts         # ユーザー設定（ランク・コメント）関連
├── tags.ts                     # タグ関連
└── folders.ts                  # フォルダー関連
```

### 1. `lib/db/helpers/query-builders.ts` (約30行)

**責任**: クエリ構築のためのヘルパー関数

```typescript
// 分類フィルタのWHERE句を生成
export function getModeWhereClause(mode: SearchMode): string

// いいねフィルタのWHERE句を生成
export function getRankWhereClause(rank: RankFilter): string
```

### 2. `lib/db/recipes.ts` (約300行)

**責任**: レシピの検索・取得

```typescript
// レシピ一覧を取得
export async function getRecipes(...): Promise<RecipeListResult>

// タイトルでレシピを検索
export async function getRecipesByTitle(...): Promise<RecipeListResult>

// タグでレシピを検索
export async function getRecipesByTag(...): Promise<RecipeListResult>

// フォルダー内のレシピを取得
export async function getRecipesByFolder(...): Promise<RecipeListResult>

// レシピIDで検索
export async function getRecipeById(...): Promise<RecipeListResult>
```

**依存関係**: 
- `helpers/query-builders.ts` の `getModeWhereClause`, `getRankWhereClause` を使用

### 3. `lib/db/user-preferences.ts` (約60行)

**責任**: ユーザーのレシピに対する設定（ランク・コメント）の更新

```typescript
// いいね状態を更新
export async function updateRank(...): Promise<void>

// コメントを更新
export async function updateComment(...): Promise<void>
```

### 4. `lib/db/tags.ts` (約180行)

**責任**: タグマスターの取得・検索

```typescript
// レベル別タグを取得
export async function getTagsByLevel(...): Promise<Tag[]>

// タグ名からタグ情報を取得
export async function getTagByName(...): Promise<...>

// 階層値からタグのnameを取得
export async function getTagNameByHierarchy(...): Promise<string | null>

// タグ名に一致するレシピ数を取得
export async function getRecipeCountByTag(...): Promise<number>
```

### 5. `lib/db/folders.ts` (約100行)

**責任**: ユーザーフォルダーへのレシピ追加・削除

```typescript
// ユーザーのフォルダーにレシピが登録されているか確認
export async function isRecipeInFolder(...): Promise<boolean>

// レシピをフォルダーに追加
export async function addRecipeToFolder(...): Promise<void>

// レシピをフォルダーから削除
export async function removeRecipeFromFolder(...): Promise<void>
```

### 6. `lib/db/index.ts` (約20行)

**責任**: 後方互換性のための再エクスポート

```typescript
// すべての関数を再エクスポート
export * from './recipes';
export * from './user-preferences';
export * from './tags';
export * from './folders';
export * from './helpers/query-builders';
```

これにより、既存のコード `import * as db from "@/lib/db"` は変更不要です。

## 移行手順

### ステップ1: ディレクトリ構造の作成
```bash
mkdir -p lib/db/helpers
```

### ステップ2: ヘルパー関数の移動
- `getModeWhereClause` と `getRankWhereClause` を `lib/db/helpers/query-builders.ts` に移動

### ステップ3: 各モジュールの作成
1. `lib/db/recipes.ts` を作成し、レシピ関連関数を移動
2. `lib/db/user-preferences.ts` を作成し、ユーザー設定関連関数を移動
3. `lib/db/tags.ts` を作成し、タグ関連関数を移動
4. `lib/db/folders.ts` を作成し、フォルダー関連関数を移動

### ステップ4: インデックスファイルの作成
- `lib/db/index.ts` を作成し、すべての関数を再エクスポート

### ステップ5: 既存ファイルの更新
- `lib/db.ts` を削除し、`lib/db/index.ts` へのシンボリックリンクまたは再エクスポートのみのファイルに変更
  - または、`lib/db.ts` を `export * from './db/index'` のみのファイルに変更

### ステップ6: テスト
- 既存のインポートが正常に動作することを確認
- `lib/actions/recipes.ts` での使用を確認

## 期待される効果

1. **可読性の向上**: 各ファイルが単一の責任を持つため、理解しやすくなる
2. **保守性の向上**: 変更の影響範囲が明確になる
3. **テスト容易性の向上**: 各モジュールを独立してテストできる
4. **再利用性の向上**: 必要な機能だけをインポートできる
5. **ファイルサイズの削減**: 最大ファイルが約300行に削減される

## 注意事項

- 既存の `import * as db from "@/lib/db"` は変更不要（後方互換性を維持）
- 各モジュール間の依存関係を最小限に保つ
- 共通の型定義は `lib/types/recipe.ts` からインポート

