# レノちゃん実装プラン

## 1. 概要

### 1.1 目的
つくおめ相当の機能をレノちゃん（ユーザー向けアプリ）に実装するための実装プランです。
認証とDB接続のテストは完了しているため、これからユーザー向け機能を実装していきます。

### 1.2 実装範囲
- ナビゲーションバー機能
- レシピ一覧表示・検索機能
- レシピ操作モーダルダイアログ（いいね・コメント・フォルダー機能）
- フォルダー機能（ユーザー別）
- タグ検索機能（閲覧のみ）

### 1.3 実装しない機能
- レシピ追加・編集・削除（管理機能のため、つくおめ側で実施）
- タグメンテナンス（管理機能のため、つくおめ側で実施）
- スクレイピング機能（管理機能のため、つくおめ側で実施）
- LLM連携（管理機能のため、つくおめ側で実施）

---

## 2. 必要な依存関係

### 2.1 shadcn/ui関連の依存関係
UIコンポーネントライブラリとして**shadcn/ui**を積極的に利用します。つくおめの実装を踏襲し、以下の依存関係を追加してください。

**インストールコマンド**:
```bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react zod
```

**依存関係の詳細**:
- `@radix-ui/react-alert-dialog`: アラートダイアログ（評価設定モーダルなど）
- `@radix-ui/react-dialog`: ダイアログ（コメント入力、フォルダー設定など）
- `@radix-ui/react-checkbox`: チェックボックス（フォルダー選択など）
- `@radix-ui/react-slot`: スロットコンポーネント（shadcn/uiの基本コンポーネント）
- `class-variance-authority`: クラス名のバリアント管理
- `clsx`: 条件付きクラス名の結合
- `tailwind-merge`: Tailwind CSSクラスのマージ
- `lucide-react`: アイコンライブラリ（Heart, Star, MessageSquare, ChevronDown/Upなど）
- `zod`: バリデーションライブラリ（フォームバリデーションなど）

### 2.2 shadcn/uiのセットアップ
1. **components.jsonの設定**:
   - つくおめの`components.json`を参考に設定
   - スタイル: `new-york`
   - RSC: `true`
   - アイコンライブラリ: `lucide`

2. **必要なshadcn/uiコンポーネントの追加**:
   ```bash
   npx shadcn@latest add alert-dialog
   npx shadcn@latest add dialog
   npx shadcn@latest add button
   npx shadcn@latest add input
   npx shadcn@latest add textarea
   npx shadcn@latest add checkbox
   npx shadcn@latest add dropdown-menu
   ```

3. **utils.tsの作成**:
   - `lib/utils.ts`に`cn`関数を作成（`clsx`と`tailwind-merge`を使用）

### 2.3 その他の依存関係
- 既にインストール済み: `next-auth`, `@prisma/client`, `@vercel/postgres`など
- 追加不要: スクレイピング、LLM連携関連のパッケージは不要（管理機能のため）

---

## 3. 実装順序

### フェーズ0: 依存関係のインストールとセットアップ
**目的**: 必要な依存関係をインストールし、shadcn/uiをセットアップ

**実装内容**:
1. 依存関係のインストール:
   - shadcn/ui関連の依存関係をインストール（2.1節参照）
2. shadcn/uiのセットアップ:
   - `components.json`の設定
   - 必要なコンポーネントの追加（2.2節参照）
   - `lib/utils.ts`の作成
3. 動作確認:
   - shadcn/uiコンポーネントが正常に動作することを確認

**完了条件**:
- すべての依存関係がインストールされている
- shadcn/uiコンポーネントが正常に動作する
- `lib/utils.ts`が作成されている

---

### フェーズ1: データベーススキーマの実装
**目的**: レシピ、タグ、ユーザー設定、フォルダーのテーブルをPrismaスキーマに追加

**実装内容**:
1. Prismaスキーマに以下を追加:
   - `RenoRecipe` モデル（`reno_recipes`テーブル）
   - `RenoTagMaster` モデル（`reno_tag_master`テーブル）
   - `RenoUserRecipePreference` モデル（`reno_user_recipe_preferences`テーブル）
   - `RenoUserFolder` モデル（`reno_user_folders`テーブル）
2. マイグレーション実行
3. データベース接続テスト

**参考資料**:
- `docs/02_SOLUTION_DESIGN.md` の4.1節（データベーススキーマ詳細）
- `docs/database_schema` メモリ

**完了条件**:
- Prismaスキーマが正しく定義されている
- マイグレーションが成功している
- データベース接続が正常に動作している

---

### フェーズ1.5: ナビゲーションバーの実装
**目的**: すべてのページで共通して使用するナビゲーションバーを実装

**実装内容**:
1. ナビゲーションバーコンポーネントの作成:
   - `app/components/NavigationBar.tsx` を作成
   - 固定ヘッダー（画面上部に固定表示）
   - ロゴ表示（アプリケーションロゴ）
   - ユーザー名表示（セッションから取得）
2. メニュー項目の実装:
   - レシピ一覧（ホーム）
   - タグ検索
   - フォルダ
   - ログアウト
   - **注意**: レシピ追加、タグメンテは実装しない（管理機能のため）
3. レスポンシブ対応:
   - デスクトップ: フルメニュー表示
   - モバイル: ハンバーガーメニュー
4. レイアウトへの統合:
   - `app/layout.tsx` または `app/recipes/layout.tsx` にナビゲーションバーを追加
   - すべての認証済みページで表示

**参考資料**:
- `docs/01_REQUIREMENTS.md` の7.1.1節（ナビゲーションバー）
- `/root/tukuome3v2/app/components`（つくおめの実装）

**完了条件**:
- ナビゲーションバーがすべてのページで正しく表示される
- メニュー項目が正常に動作する（ページ遷移）
- レスポンシブデザインが正常に動作する（モバイルでハンバーガーメニュー）
- ユーザー名が正しく表示される
- ログアウト機能が正常に動作する

---

### フェーズ2: レシピ一覧表示機能（基本）
**目的**: レシピ一覧を表示する基本機能を実装

**実装内容**:
1. サーバーアクションの作成:
   - `lib/actions/recipes.ts` に `getRecipes()` 関数を作成
   - ページネーション対応（offset, limit）
   - つくれぽ数降順でソート（デフォルト）
2. レシピ一覧ページの実装:
   - `app/recipes/page.tsx` を更新
   - グリッドレイアウトでレシピカードを表示
   - レスポンシブ対応（つくおめを踏襲）:
     - PC: 6列×2行（12件）
     - iPad: 4列×3行（12件）
     - スマホ: 2列×6行（12件）
3. レシピカードコンポーネントの作成:
   - `app/components/RecipeCard.tsx` を作成
   - 画像、タイトル、つくれぽ数を表示
   - 画像・タイトルクリックでクックパッドのレシピページに遷移:
     - リンク先: `https://cookpad.com/jp/recipes/{recipeId}`
     - 新しいタブで開く（`target="_blank"`）
     - セキュリティ対策（`rel="noopener noreferrer"`）
   - 操作アイコン（lucide-reactを使用）:
     - Heart（いいねボタン）: 評価状態に応じて色を変更（rank=1: 赤、rank=2: オレンジ、その他: グレー）
     - Star（フォルダーボタン）: フォルダー登録済みの場合、黄色で塗りつぶし
     - MessageSquare（コメントボタン）: コメント有無に応じて色を変更（コメントあり: 青、なし: グレー）
   - 各アイコンクリックで対応するモーダルダイアログを開く（フェーズ4で実装）
4. ページネーション機能:
   - Load More方式で無限スクロール
   - `app/components/RecipeListWithLoadMore.tsx` を作成

**参考資料**:
- `docs/01_REQUIREMENTS.md` の5.1.1節（レシピ一覧表示）
- `/root/tukuome3v2/app/recipes/page.tsx`（つくおめの実装）

**完了条件**:
- レシピ一覧が正しく表示される
- ページネーションが正常に動作する
- 画像、タイトル、つくれぽ数が正しく表示される

---

### フェーズ3: 検索・フィルタリング機能
**目的**: レシピを検索・フィルタリングする機能を実装

**実装内容**:
1. 検索機能の実装:
   - タイトル検索（部分一致）
   - レシピID検索（数値のみの入力でレシピID検索）
2. フィルタリング機能の実装:
   - 分類フィルタ（すべて/主菜/副菜/その他）
   - いいねフィルタ（すべて/好き/まあまあ）
   - タグフィルタ（すべて/タグ未設定）
   - ソート（つくれぽ数昇順/降順、レシピID降順）
3. フィルターコントロールコンポーネントの作成:
   - `app/components/RecipeFilterControls.tsx` を作成
   - URLクエリパラメータで検索条件を保持
   - レスポンシブ対応（つくおめを踏襲）:
     - PC（lg以上）: 常に表示
     - タブレット・スマホ（lg未満）: 折りたたみ表示、ボタンクリックで開閉
     - 開閉ボタンにChevronDown/ChevronUpアイコン（lucide-react）を使用
     - 検索条件変更時に自動で折りたたむ
4. サーバーアクションの拡張:
   - `getFilteredRecipes()` 関数を作成
   - 検索条件に応じたクエリを実行

**参考資料**:
- `docs/01_REQUIREMENTS.md` の5.2節（検索・フィルタリング機能）
- `/root/tukuome3v2/app/recipes/page.tsx`（つくおめの実装）

**完了条件**:
- タイトル検索が正常に動作する
- レシピID検索が正常に動作する
- すべてのフィルターが正常に動作する
- URLクエリパラメータで検索条件が保持される

---

### フェーズ4: レシピ操作モーダルダイアログ（いいね・コメント・フォルダー機能）
**目的**: レシピカードからモーダルダイアログでいいね・コメント・フォルダー機能を実装

**実装内容**:
1. 評価設定モーダルダイアログの実装:
   - `app/components/LikeDialog.tsx` を作成
   - 4段階評価を選択可能（0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない）
   - Radix UIのAlertDialogを使用
   - サーバーアクション `updateRank()` を作成
   - `reno_user_recipe_preferences` テーブルに `rank` を保存
2. コメント入力モーダルダイアログの実装:
   - `app/components/CommentDialog.tsx` を作成
   - テキストエリアでコメントを入力・編集
   - Radix UIのDialogを使用
   - サーバーアクション `updateComment()` を作成
   - `reno_user_recipe_preferences` テーブルに `comment` を保存
3. フォルダー設定モーダルダイアログの実装:
   - `app/components/FolderDialog.tsx` を作成
   - フォルダー一覧を表示（チェックボックス付き）
   - フォルダー作成・削除機能
   - レシピをフォルダーに追加/削除
   - Radix UIのDialogを使用
   - サーバーアクション `addRecipeToFolder()`, `removeRecipeFromFolder()` を使用（フェーズ5で実装）
4. レシピカードコンポーネントの拡張:
   - `app/components/RecipeCard.tsx` を更新
   - いいねボタンクリックで `LikeDialog` を開く
   - コメントボタンクリックで `CommentDialog` を開く
   - フォルダーボタンクリックで `FolderDialog` を開く
   - 現在の評価状態（rank）を表示（ハートアイコンの色で表現）
   - コメント有無を表示

**参考資料**:
- `docs/01_REQUIREMENTS.md` の5.1.5節（レシピ詳細操作）
- `docs/02_SOLUTION_DESIGN.md` の4.1.2節（ユーザー別データベース）
- `/root/tukuome3v2/app/components/LikeDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/CommentDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/FolderDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/RecipeCard.tsx`（つくおめの実装）

**完了条件**:
- レシピカードから評価設定モーダルが開ける
- 評価設定が正常に動作する（4段階評価）
- レシピカードからコメント入力モーダルが開ける
- コメント機能が正常に動作する
- レシピカードからフォルダー設定モーダルが開ける
- 現在の評価状態がレシピカードに表示される

---

### フェーズ5: フォルダー機能
**目的**: ユーザー別のフォルダー機能を実装

**実装内容**:
1. フォルダー一覧ページの作成:
   - `app/recipes/folders/page.tsx` を作成
   - ユーザーのフォルダー一覧を表示（グリッドレイアウト）
   - サムネイル画像4枚を表示
2. フォルダー作成機能:
   - サーバーアクション `createFolder()` を作成
   - `reno_user_folders` テーブルに保存
3. フォルダー削除機能:
   - サーバーアクション `deleteFolder()` を作成
4. フォルダー内レシピ一覧:
   - `app/recipes/folders/[folderName]/page.tsx` を作成
   - フォルダー内のレシピ一覧を表示
5. レシピをフォルダーに追加/削除:
   - サーバーアクション `addRecipeToFolder()`, `removeRecipeFromFolder()` を作成
   - `fetchFolders(recipeId)` 関数を作成（フォルダー一覧を取得、レシピの登録状態付き）
   - **注意**: フォルダー設定モーダルダイアログ（フェーズ4で実装）から使用

**参考資料**:
- `docs/01_REQUIREMENTS.md` の5.4節（フォルダー管理機能）
- `docs/02_SOLUTION_DESIGN.md` の4.1.2節（ユーザー別データベース）

**完了条件**:
- フォルダー一覧が正しく表示される
- フォルダー作成・削除が正常に動作する
- フォルダー内レシピ一覧が正しく表示される
- レシピをフォルダーに追加/削除できる（フォルダー設定モーダルダイアログから）

---

### フェーズ6: タグ検索機能
**目的**: 階層構造を持つタグからレシピを検索する機能を実装

**実装内容**:
1. タグ検索ページの作成:
   - `app/recipes/tags/page.tsx` を作成
   - 大タグ（level=0）の一覧を表示
2. 階層ナビゲーション機能:
   - 大タグ → 中タグ → 小タグ → 極小タグの階層を表示
   - `app/recipes/tags/[level]/[value]/page.tsx` を作成
3. タグカードコンポーネントの作成:
   - `app/components/TagCard.tsx` を作成
   - タグ画像、表示名、子タグ数/レシピ数を表示
4. タグからレシピ検索:
   - タグをクリックでレシピ一覧ページに遷移（タグフィルタ適用）
5. サーバーアクションの実装:
   - `getTagsByLevel()` 関数を作成
   - `getRecipesByTag()` 関数を作成

**参考資料**:
- `docs/01_REQUIREMENTS.md` の5.3節（タグ管理機能）
- `/root/tukuome3v2/app/recipes/tags`（つくおめの実装）

**完了条件**:
- タグ検索ページが正しく表示される
- 階層ナビゲーションが正常に動作する
- タグからレシピ検索が正常に動作する

---

## 4. 技術的な考慮事項

### 3.1 データベースクエリの最適化
- インデックスを適切に設定（Prismaスキーマで定義）
- JOINクエリの最適化
- ページネーションの実装（LIMIT/OFFSET）

### 3.2 パフォーマンス
- Server Componentsを積極的に活用
- Client Componentsは必要最小限に
- 画像最適化（Next.js Imageコンポーネント）

### 3.3 型安全性
- TypeScriptの型定義を適切に使用
- Prisma Clientの型を活用
- サーバーアクションの型定義

### 3.4 セキュリティ
- 認証チェック（すべてのサーバーアクションで実施）
- ユーザーIDでデータをフィルタリング（ユーザー別データ）
- SQLインジェクション対策（Prismaを使用）

---

## 5. 実装時の注意点

### 4.1 つくおめとの違い
- **レシピ追加・編集・削除機能は実装しない**（管理機能のため）
- **タグメンテナンス機能は実装しない**（管理機能のため）
- **ユーザー別データは `rank`、`comment`、`folder` のみ**（共通データは全ユーザー共通）

### 4.2 データ連携
- つくおめからデータ連携スクリプトで `reno_recipes` と `reno_tag_master` にデータを投入
- データ連携は手動実行または定期実行（リアルタイム連携は行わない）

### 4.3 UI/UX
- つくおめのUIを参考にするが、ユーザー向けに簡略化
- レスポンシブデザインを考慮
- ダークモード対応（既存の実装に合わせる）

---

## 6. テスト計画

### 5.1 各フェーズでのテスト
- データベース接続テスト
- 機能テスト（各機能が正常に動作するか）
- UIテスト（表示が正しいか）

### 5.2 統合テスト
- 認証フロー全体のテスト
- データ連携のテスト（つくおめからデータを投入して動作確認）

---

## 7. 実装順序の推奨

1. **フェーズ0**: 依存関係のインストールとセットアップ（最優先）
2. **フェーズ1**: データベーススキーマの実装
3. **フェーズ1.5**: ナビゲーションバーの実装（すべてのページで使用するため早期実装）
4. **フェーズ2**: レシピ一覧表示機能（基本）
5. **フェーズ3**: 検索・フィルタリング機能
6. **フェーズ4**: レシピ操作モーダルダイアログ（いいね・コメント・フォルダー機能）
7. **フェーズ5**: フォルダー機能（フォルダー一覧ページ、フォルダー内レシピ一覧）
8. **フェーズ6**: タグ検索機能

## 8. 次のステップ

1. **フェーズ0から順番に実装**
2. **各フェーズ完了後に動作確認**
3. **問題があれば修正してから次のフェーズへ**

---

## 9. 参考資料

- `docs/01_REQUIREMENTS.md`: つくおめの機能要件
- `docs/02_SOLUTION_DESIGN.md`: レノちゃんの設計ドキュメント
- `docs/11_AUTHENTICATION_IMPLEMENTATION_PLAN.md`: 認証実装プラン
- `/root/tukuome3v2`: つくおめのソースコード（参考）

---

## 10. 更新履歴

- 2024-XX-XX: 初版作成

