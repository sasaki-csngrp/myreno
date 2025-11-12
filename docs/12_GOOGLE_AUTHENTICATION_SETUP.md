# Google認証設定手順

## 1. 概要

レノちゃんアプリケーションでGoogle認証を有効にするための詳細な設定手順です。
NextAuth.jsのGoogle Providerを使用して、Googleアカウントでのログインを実装します。

---

## 2. Google Cloud Consoleでの設定

### 2.1 プロジェクトの作成

1. **Google Cloud Consoleにアクセス**
   - [Google Cloud Console](https://console.cloud.google.com/)にアクセス
   - Googleアカウントでログイン

2. **新しいプロジェクトを作成**
   - 画面上部のプロジェクト選択ドロップダウンをクリック
   - 「新しいプロジェクト」をクリック
   - プロジェクト名を入力（例: `reno-chan-auth`）
   - 組織（Organization）は必要に応じて選択
   - 「作成」をクリック
   - プロジェクトが作成されるまで数秒待機

3. **プロジェクトを選択**
   - プロジェクト選択ドロップダウンから作成したプロジェクトを選択

### 2.2 OAuth同意画面の設定

1. **OAuth同意画面にアクセス**
   - 左側のメニューから「APIとサービス」→「OAuth同意画面」を選択

2. **ユーザータイプの選択**
   - **外部**: 一般ユーザーがアクセス可能（推奨：開発・テスト段階）
   - **内部**: Google Workspace組織内のみ（本番環境で組織限定の場合）
   - 通常は「外部」を選択して「作成」をクリック

3. **アプリ情報の入力**
   - **アプリ名**: 「レノちゃん」または「Reno Chan」（必須）
   - **ユーザーサポートメール**: 自分のメールアドレスを選択（必須）
   - **アプリのロゴ**: 任意（アップロード可能）
   - **アプリのホームページ**: 本番環境のURL（例: `https://yourdomain.com`）
   - **アプリのプライバシーポリシーリンク**: プライバシーポリシーページのURL（必須）
   - **アプリの利用規約リンク**: 利用規約ページのURL（任意）
   - **承認済みのドメイン**: 本番環境のドメイン（例: `yourdomain.com`）

4. **スコープの設定**
   - 「スコープを追加または削除」をクリック
   - デフォルトで以下のスコープが追加されています：
     - `.../auth/userinfo.email`（メールアドレス）
     - `.../auth/userinfo.profile`（基本プロフィール情報）
   - これらで十分なので、「更新」をクリック

5. **テストユーザーの追加（開発段階のみ）**
   - 「テストユーザー」セクションで「+ ADD USERS」をクリック
   - テスト用のGoogleアカウントのメールアドレスを追加
   - **注意**: 外部ユーザータイプの場合、公開前にテストユーザーを追加する必要があります
   - 「保存」をクリック

6. **保存**
   - 画面下部の「保存して次へ」をクリック
   - 各ステップを確認して「ダッシュボードに戻る」をクリック

### 2.3 OAuth 2.0認証情報の作成

1. **認証情報ページにアクセス**
   - 左側のメニューから「APIとサービス」→「認証情報」を選択

2. **OAuth 2.0 クライアント IDの作成**
   - 「+ 認証情報を作成」をクリック
   - 「OAuth 2.0 クライアント ID」を選択

3. **アプリケーションの種類を選択**
   - 「ウェブアプリケーション」を選択
   - 「作成」をクリック

4. **OAuth 2.0 クライアント IDの設定**
   - **名前**: 「レノちゃん Web Client」など（任意）
   - **承認済みの JavaScript 生成元**:
     - 開発環境: `http://localhost:3050`
     - 本番環境: `https://yourdomain.com`
     - 複数追加可能（「+ URI を追加」をクリック）
   - **承認済みのリダイレクト URI**:
     - 開発環境: `http://localhost:3050/api/auth/callback/google`
     - 本番環境: `https://yourdomain.com/api/auth/callback/google`
     - 複数追加可能（「+ URI を追加」をクリック）

5. **作成**
   - 「作成」をクリック

6. **クライアントIDとシークレットの取得**
   - モーダルが表示され、以下が表示されます：
     - **クライアント ID**: 例: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
     - **クライアント シークレット**: 例: `GOCSPX-abcdefghijklmnopqrstuvwxyz`
   - **重要**: この情報は後で表示できないため、必ずコピーして保存してください
   - 「OK」をクリック

---

## 3. 環境変数の設定

### 3.1 `.env.local`ファイルの更新

取得したクライアントIDとシークレットを環境変数に設定します：

```bash
# Google認証
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnop.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnopqrstuvwxyz"
```

### 3.2 環境変数の確認

設定が正しいか確認：

```bash
# 開発環境で確認
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

---

## 4. NextAuth.jsの設定確認

### 4.1 API Routeの設定

`app/api/auth/[...nextauth]/route.ts`でGoogle Providerが正しく設定されているか確認：

```typescript
import GoogleProvider from 'next-auth/providers/google';

// ...

GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
```

### 4.2 環境変数の読み込み確認

Next.jsは`.env.local`ファイルを自動的に読み込みますが、開発サーバーを再起動する必要があります：

```bash
# 開発サーバーを停止（Ctrl+C）
# 再度起動
npm run dev
```

---

## 5. 動作確認

### 5.1 開発環境でのテスト

1. **ログインページにアクセス**
   - `http://localhost:3050/login`にアクセス

2. **Google認証ボタンをクリック**
   - 「Googleでログイン」ボタンをクリック

3. **Google認証画面**
   - Googleアカウントの選択画面が表示される
   - アカウントを選択

4. **権限の承認**
   - 「レノちゃんが次のアクセス権限をリクエストしています」画面が表示
   - 表示される権限を確認（メールアドレス、基本プロフィール情報）
   - 「許可」をクリック

5. **リダイレクト確認**
   - 正常にログインできれば、指定したコールバックURL（`/recipes`など）にリダイレクトされる
   - セッションが作成されていることを確認

### 5.2 エラーの確認

エラーが発生した場合：

1. **ブラウザのコンソールを確認**
   - 開発者ツール（F12）を開く
   - Consoleタブでエラーメッセージを確認

2. **サーバーログを確認**
   - ターミナルでNext.jsのログを確認
   - エラーメッセージを確認

3. **よくあるエラー**
   - `redirect_uri_mismatch`: リダイレクトURIが一致していない
   - `invalid_client`: クライアントIDまたはシークレットが間違っている
   - `access_denied`: ユーザーが権限を拒否した

---

## 6. 本番環境へのデプロイ

### 6.1 本番環境のリダイレクトURI追加

1. **Google Cloud Consoleで認証情報を編集**
   - 「認証情報」ページで作成したOAuth 2.0 クライアント IDをクリック
   - 「承認済みのリダイレクト URI」に本番環境のURLを追加：
     - `https://yourdomain.com/api/auth/callback/google`
   - 「保存」をクリック

2. **環境変数の設定**
   - 本番環境（Vercel、Netlify等）の環境変数設定画面で以下を設定：
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `NEXTAUTH_URL`（本番環境のURL）

### 6.2 OAuth同意画面の公開（本番環境）

1. **公開状態の確認**
   - 「OAuth同意画面」ページで「公開ステータス」を確認
   - 「テスト」状態のままでは、テストユーザー以外はログインできません

2. **公開（本番環境のみ）**
   - 「公開」をクリック
   - 警告を確認して「確認」をクリック
   - **注意**: 公開すると、すべてのGoogleユーザーがログイン可能になります

---

## 7. セキュリティ考慮事項

### 7.1 クライアントシークレットの保護

- **絶対にGitにコミットしない**
  - `.env.local`は`.gitignore`に追加されていることを確認
  - 本番環境の環境変数は管理画面で設定

- **定期的なローテーション**
  - 定期的にクライアントシークレットを再生成
  - 古いシークレットを無効化

### 7.2 リダイレクトURIの制限

- **必要なURIのみ追加**
  - 開発環境と本番環境のURIのみ
  - 不要なURIは削除

### 7.3 スコープの最小化

- **必要なスコープのみ要求**
  - デフォルトの`email`と`profile`で十分
  - 追加のスコープは本当に必要な場合のみ

---

## 8. トラブルシューティング

### 8.1 よくある問題と解決策

#### 問題1: `redirect_uri_mismatch`エラー

**原因**: リダイレクトURIが一致していない

**解決策**:
1. Google Cloud Consoleの「認証情報」で設定を確認
2. リダイレクトURIが完全に一致しているか確認（末尾のスラッシュ、プロトコル等）
3. 開発環境: `http://localhost:3050/api/auth/callback/google`
4. 本番環境: `https://yourdomain.com/api/auth/callback/google`

#### 問題2: `invalid_client`エラー

**原因**: クライアントIDまたはシークレットが間違っている

**解決策**:
1. `.env.local`の`GOOGLE_CLIENT_ID`と`GOOGLE_CLIENT_SECRET`を確認
2. コピー&ペースト時に余分なスペースが入っていないか確認
3. 開発サーバーを再起動

#### 問題3: `access_denied`エラー

**原因**: ユーザーが権限を拒否した、またはテストユーザーに追加されていない

**解決策**:
1. テストユーザーに追加されているか確認（開発段階）
2. OAuth同意画面が「公開」状態か確認（本番環境）

#### 問題4: 認証後、リダイレクトされない

**原因**: コールバックURLの設定ミス、またはセッション設定の問題

**解決策**:
1. NextAuth.jsの`callbacks`設定を確認
2. `NEXTAUTH_URL`環境変数が正しく設定されているか確認
3. ブラウザのCookie設定を確認

### 8.2 デバッグ方法

1. **NextAuth.jsのデバッグモードを有効化**
   ```typescript
   const handler = NextAuth({
     // ...
     debug: process.env.NODE_ENV === 'development',
   });
   ```

2. **Google Cloud Consoleのログを確認**
   - 「APIとサービス」→「ダッシュボード」でAPI使用状況を確認

3. **ブラウザの開発者ツール**
   - Networkタブでリクエスト/レスポンスを確認
   - ApplicationタブでCookieとセッションストレージを確認

---

## 9. 参考資料

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)（テスト用）

---

## 10. チェックリスト

### 初期設定
- [ ] Google Cloud Consoleでプロジェクトを作成
- [ ] OAuth同意画面を設定
- [ ] OAuth 2.0 クライアント IDを作成
- [ ] クライアントIDとシークレットをコピーして保存
- [ ] `.env.local`に環境変数を設定
- [ ] 開発サーバーを再起動

### 開発環境でのテスト
- [ ] ログインページにアクセス
- [ ] Google認証ボタンをクリック
- [ ] Google認証画面が表示される
- [ ] アカウントを選択してログイン
- [ ] 正常にリダイレクトされる
- [ ] セッションが作成される

### 本番環境へのデプロイ
- [ ] 本番環境のリダイレクトURIを追加
- [ ] 本番環境の環境変数を設定
- [ ] OAuth同意画面を公開（必要に応じて）
- [ ] 本番環境で動作確認

---

## 11. 更新履歴

- 2024-XX-XX: 初版作成

