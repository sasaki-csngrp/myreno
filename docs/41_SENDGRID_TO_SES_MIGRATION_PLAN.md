# SendGrid から AWS SES へのメール送信移行プラン

## 1. 概要・背景

### 1.1 目的

- **SendGrid 無料プラン廃止**に伴い、ユーザーメール認証（登録時確認メール）の送信を **Amazon SES (Simple Email Service)** に移行する。
- 既存の「送信インターフェース」は維持し、呼び出し元（`app/api/auth/register/route.ts`）の変更を最小限にする。

### 1.2 スコープ

| 対象 | 内容 |
|------|------|
| 移行する機能 | 新規登録時の「メールアドレス確認」メール送信のみ |
| 変更するファイル | `lib/sendgrid.ts` → `lib/email.ts`（SES実装）、`app/api/auth/register/route.ts`（import変更）、`package.json` |
| 削除するもの | `lib/sendgrid.ts`、`@sendgrid/mail` 依存 |

---

## 2. 現状（SendGrid）

### 2.1 利用箇所

- **`lib/sendgrid.ts`**: `sendEmail({ to, subject, html, text? })` を export。
- **`app/api/auth/register/route.ts`**: 上記 `sendEmail` を import し、確認メール送信に使用。

### 2.2 環境変数

- `SENDGRID_API_KEY`: SendGrid API キー
- `EMAIL_FROM`: 送信元メールアドレス（移行後もそのまま利用）

### 2.3 依存パッケージ

- `@sendgrid/mail`: ^8.1.6

---

## 3. 移行先: AWS SES の選定理由

- 既に **AWS 利用実績あり**（S3: `@aws-sdk/client-s3`、.env に `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` あり）。
- **同一 AWS アカウント・同一 IAM で SES を追加**しやすく、運用がシンプル。
- **無料枠**（月 62,000 通まで等）があり、トランザクションメール用途で十分な場合が多い。
- SendGrid と同様に **HTML/テキストメール** を送信可能。

---

## 4. AWS SES の前提・制約

### 4.1 サンドボックス

- 新規 SES は **サンドボックス** 状態。
  - 送信可能なのは **検証済みのメールアドレス（またはドメイン）** のみ。
  - 本番で「未検証の任意アドレス」へ送信するには **サンドボックス解除**（AWS サポートへの申請）が必要。

### 4.2 送信元の検証

- **送信元メールアドレス**（`EMAIL_FROM`）を SES で「検証」する必要あり。
  - 単一アドレス: **メールアドレス検証**
  - ドメイン全体: **ドメイン検証**（DKIM 等）
- 検証完了まで、そのアドレス（またはドメイン）からの送信は不可。

### 4.3 認証

- **IAM ユーザー**の `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` で SDK から送信。
- 必要な権限: `ses:SendEmail`（および必要に応じて `ses:SendRawEmail`）。
- 既存の S3 用 IAM に SES 権限を付与するか、SES 専用の IAM ユーザーを作成する。

### 4.4 リージョン

- SES は **リージョンごと** のサービス。送信もそのリージョンの SES エンドポイントを使用。
- 既存の `AWS_REGION=ap-northeast-1` を利用するか、SES 用に別リージョン（例: `us-east-1`）を指定するかは運用方針による。多くの場合は **ap-northeast-1** で統一可能。

---

## 5. 実装プラン（詳細）

### 5.1 パッケージ変更

| 操作 | パッケージ |
|------|------------|
| 追加 | `@aws-sdk/client-ses`（SES 用 SDK） |
| 削除 | `@sendgrid/mail` |

- 既存の `@aws-sdk/client-s3` はそのまま。SES 用に `@aws-sdk/client-ses` を追加。

### 5.2 新規: `lib/email.ts`

- **役割**: メール送信の唯一の窓口。中で AWS SES を呼ぶ。
- **インターフェース**: 現行と同一とする。

```ts
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  // SES SendEmailCommand で送信
  // - Source: process.env.EMAIL_FROM
  // - Destination.ToAddresses: [to]
  // - Message.Subject.Data, Body.Html.Data, Body.Text.Data
}
```

- **環境変数**:
  - `EMAIL_FROM`: 送信元（必須）。SES で検証済みであること。
  - `AWS_REGION`: 既存のまま利用（未設定時は `ap-northeast-1` 等フォールバック可）。
  - 認証: 既存の `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` を利用。

- **エラーハンドリング**: 送信失敗時は `throw` し、呼び出し元（register）の「メール失敗時もユーザー作成は成功」という挙動は変更しない。

### 5.3 変更: `app/api/auth/register/route.ts`

- `import { sendEmail } from '@/lib/sendgrid'` を  
  `import { sendEmail } from '@/lib/email'` に変更するのみ。
- その他のロジックは変更しない。

### 5.4 削除: `lib/sendgrid.ts`

- SES 移行後、`lib/sendgrid.ts` を削除する。

### 5.5 環境変数（移行後）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `EMAIL_FROM` | ○ | 送信元メールアドレス（SES で検証済み） |
| `AWS_REGION` | ○ | SES を利用するリージョン（例: `ap-northeast-1`） |
| `AWS_ACCESS_KEY_ID` | ○ | IAM アクセスキー（SES 送信権限あり） |
| `AWS_SECRET_ACCESS_KEY` | ○ | IAM シークレットキー |

- **削除**: `SENDGRID_API_KEY`（不要になるため削除してよい）。

### 5.6 AWS コンソールでの設定手順（チェックリスト）

1. **SES の有効化**
   - 対象リージョン（例: 東京）で SES が利用可能であることを確認。

2. **送信元の検証**
   - **メールアドレス検証**: SES コンソール → Verified identities → Create identity → Email address で `EMAIL_FROM` を登録し、届いた検証メールで検証。
   - または **ドメイン検証**: ドメインを登録し、DNS に CNAME 等を設定して検証。

3. **IAM 権限**
   - 使用する IAM ユーザーに `ses:SendEmail`（必要なら `ses:SendRawEmail`）を付与。
   - ポリシー例:
     ```json
     {
       "Effect": "Allow",
       "Action": ["ses:SendEmail", "ses:SendRawEmail"],
       "Resource": "*"
     }
     ```

4. **サンドボックス解除（本番で任意の宛先に送る場合）**
   - AWS サポートで「SES サンドボックス解除」を申請。
   - 解除前は「検証済みアドレス宛て」のみ送信可能。

5. **送信統計・バウンス（任意）**
   - SES コンソールで送信数・バウンス率を確認。必要に応じてアラーム設定。

---

## 6. 検証・ロールバック

### 6.1 検証

- 開発環境で新規登録フローを実行し、確認メールが届くこと、リンクでメール認証が完了することを確認。
- ログで SES の送信結果（MessageId 等）が分かれば確認。

### 6.2 ロールバック

- 問題時は `lib/email.ts` を削除し、`lib/sendgrid.ts` を復元、`register/route.ts` の import を `@/lib/sendgrid` に戻す。
- `SENDGRID_API_KEY` を再度設定し、`@sendgrid/mail` を `package.json` に戻して `npm install`。

---

## 7. ドキュメント・コード内コメントの更新

- **docs/11_AUTHENTICATION_IMPLEMENTATION_PLAN.md**: SendGrid の記述を「メール送信: AWS SES」に更新し、環境変数・設定手順を本プランまたは 41 番に合わせる。
- **docs/02_SOLUTION_DESIGN.md**: メールベリファイ／メール送信サービスの記述を SES に合わせる。
- **.env.example**（存在する場合）: `SENDGRID_API_KEY` を削除し、SES 用の変数説明を追加。

---

## 8. 実施順序まとめ

1. 本プランに沿って `lib/email.ts`（SES）を実装。
2. `app/api/auth/register/route.ts` の import を `@/lib/email` に変更。
3. `package.json` で `@aws-sdk/client-ses` 追加、`@sendgrid/mail` 削除。`npm install`。
4. `lib/sendgrid.ts` を削除。
5. 環境変数から `SENDGRID_API_KEY` を削除（SES 用 IAM と `EMAIL_FROM` 検証済みであることを前提）。
6. 開発環境で送信テスト・認証フロー確認。
7. 上記ドキュメント・.env.example を更新。

---

## 実施済み（実装完了日）

- `lib/email.ts` を新規作成（SES 利用）。
- `app/api/auth/register/route.ts` の import を `@/lib/email` に変更。
- `package.json` に `@aws-sdk/client-ses` を追加、`@sendgrid/mail` を削除。`npm install` 実行済み。
- `lib/sendgrid.ts` を削除。
- **環境変数**: `.env.local` から `SENDGRID_API_KEY` を削除してください。SES は既存の `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` と `EMAIL_FROM` を使用します。

---

## 9. 参考

- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/)
- [SendEmail API](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/classes/sendemailcommand.html)
- 既存: `docs/11_AUTHENTICATION_IMPLEMENTATION_PLAN.md`（メール送信部分）
