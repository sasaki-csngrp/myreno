# フェーズ0: 依存関係のインストールとセットアップ 詳細プラン

## 1. 概要

### 1.1 目的
shadcn/uiを利用したUIコンポーネントライブラリのセットアップを行います。つくおめの実装を踏襲し、必要な依存関係をインストールし、shadcn/uiをセットアップします。

### 1.2 前提条件
- Node.jsがインストールされていること
- npmまたはyarnが使用可能であること
- プロジェクトが既に初期化されていること

---

## 2. 依存関係のインストール

### 2.1 shadcn/ui関連の依存関係

以下のコマンドで必要な依存関係を一括インストールします：

```bash
npm install @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react zod
```

### 2.2 各依存関係の説明

- **@radix-ui/react-alert-dialog**: アラートダイアログコンポーネント（評価設定モーダルなどで使用）
- **@radix-ui/react-dialog**: ダイアログコンポーネント（コメント入力、フォルダー設定などで使用）
- **@radix-ui/react-checkbox**: チェックボックスコンポーネント（フォルダー選択などで使用）
- **@radix-ui/react-slot**: スロットコンポーネント（shadcn/uiの基本コンポーネント）
- **class-variance-authority**: クラス名のバリアント管理（Buttonコンポーネントなどで使用）
- **clsx**: 条件付きクラス名の結合
- **tailwind-merge**: Tailwind CSSクラスのマージ（競合するクラスを適切にマージ）
- **lucide-react**: アイコンライブラリ（Heart, Star, MessageSquare, ChevronDown/Upなど）
- **zod**: バリデーションライブラリ（フォームバリデーションなどで使用）

### 2.3 インストール確認

インストール後、`package.json`を確認して、以下の依存関係が追加されていることを確認してください：

```json
{
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "lucide-react": "^0.535.0",
    "zod": "^4.0.17"
  }
}
```

---

## 3. shadcn/uiのセットアップ

### 3.1 components.jsonの作成

プロジェクトルートに`components.json`ファイルを作成します。

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**設定項目の説明**:
- `style`: `new-york`（つくおめと同じスタイル）
- `rsc`: `true`（React Server Componentsを有効化）
- `tsx`: `true`（TypeScriptを使用）
- `tailwind.css`: `app/globals.css`（Tailwind CSSのグローバルスタイルファイル）
- `baseColor`: `neutral`（ベースカラー）
- `cssVariables`: `true`（CSS変数を使用）
- `aliases`: パスエイリアスの設定
- `iconLibrary`: `lucide`（lucide-reactを使用）

### 3.2 必要なshadcn/uiコンポーネントの追加

以下のコマンドで必要なコンポーネントを追加します：

```bash
# アラートダイアログ（評価設定モーダルで使用）
npx shadcn@latest add alert-dialog

# ダイアログ（コメント入力、フォルダー設定で使用）
npx shadcn@latest add dialog

# ボタン（各種ボタンで使用）
npx shadcn@latest add button

# 入力フィールド（フォルダー作成などで使用）
npx shadcn@latest add input

# テキストエリア（コメント入力で使用）
npx shadcn@latest add textarea

# チェックボックス（フォルダー選択で使用）
npx shadcn@latest add checkbox

# ドロップダウンメニュー（フィルターなどで使用）
npx shadcn@latest add dropdown-menu
```

各コマンド実行時に、以下の確認が表示されます：
- コンポーネントの追加先（通常は`components/ui`）
- 依存関係の追加（既にインストール済みの場合はスキップ）

**注意**: 各コマンドは対話的に実行されます。デフォルトの設定で問題ない場合は、Enterキーを押して進めてください。

### 3.3 コンポーネントの配置確認

コンポーネント追加後、以下のディレクトリ構造が作成されていることを確認してください：

```
components/
  ui/
    alert-dialog.tsx
    dialog.tsx
    button.tsx
    input.tsx
    textarea.tsx
    checkbox.tsx
    dropdown-menu.tsx
```

---

## 4. lib/utils.tsの作成

### 4.1 ファイルの作成

`lib/utils.ts`ファイルを作成します。

### 4.2 実装内容

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**説明**:
- `cn`関数は、条件付きクラス名を結合し、Tailwind CSSクラスの競合を解決します
- `clsx`でクラス名を結合し、`twMerge`でTailwind CSSクラスの競合を解決します
- shadcn/uiコンポーネントで使用される標準的なユーティリティ関数です

### 4.3 パスエイリアスの確認

`tsconfig.json`に以下のパスエイリアスが設定されていることを確認してください：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

これにより、`@/lib/utils`で`lib/utils.ts`をインポートできます。

---

## 5. 動作確認

### 5.1 基本的な動作確認

以下のテストコンポーネントを作成して、shadcn/uiコンポーネントが正常に動作することを確認します。

`app/test-components/page.tsx`を作成：

```typescript
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function TestComponentsPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">shadcn/ui コンポーネントテスト</h1>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Button</h2>
        <Button>ボタン</Button>
        <Button variant="outline">アウトラインボタン</Button>
        <Button variant="destructive">削除ボタン</Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">AlertDialog</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">アラートダイアログを開く</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>確認</AlertDialogTitle>
              <AlertDialogDescription>
                この操作を実行しますか？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction>実行</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">ダイアログを開く</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ダイアログタイトル</DialogTitle>
              <DialogDescription>
                ダイアログの説明文です。
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
```

### 5.2 動作確認手順

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:3050/test-components`にアクセス

3. 以下の確認を行います：
   - ボタンが正しく表示される
   - アラートダイアログが開閉できる
   - ダイアログが開閉できる
   - スタイルが正しく適用されている

### 5.3 エラーが発生した場合

**エラー: モジュールが見つからない**
- `package.json`を確認して、依存関係が正しくインストールされているか確認
- `node_modules`を削除して、`npm install`を再実行

**エラー: パスエイリアスが解決できない**
- `tsconfig.json`のパスエイリアス設定を確認
- 開発サーバーを再起動

**エラー: スタイルが適用されない**
- `app/globals.css`にTailwind CSSの設定が含まれているか確認
- `tailwind.config.ts`の設定を確認

---

## 6. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] すべての依存関係がインストールされている
- [ ] `components.json`が作成されている
- [ ] 必要なshadcn/uiコンポーネントが追加されている
- [ ] `lib/utils.ts`が作成されている
- [ ] テストコンポーネントが正常に動作する
- [ ] エラーが発生していない

---

## 7. 次のステップ

フェーズ0が完了したら、**フェーズ1: データベーススキーマの実装**に進みます。

---

## 8. 参考資料

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [lucide-react Icons](https://lucide.dev/)
- `/root/tukuome3v2/components.json`（つくおめの設定参考）
- `/root/tukuome3v2/lib/utils.ts`（つくおめの実装参考）

---

## 9. 更新履歴

- 2024-XX-XX: 初版作成

