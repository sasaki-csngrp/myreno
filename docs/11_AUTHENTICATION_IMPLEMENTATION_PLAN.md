# 認証実装詳細プラン

## 1. 概要

### 1.1 目的
レノちゃんアプリケーションにNextAuth.jsを使用した認証機能を実装する。
メール認証とGoogle認証をサポートし、メールベリファイ機能を含む。

### 1.2 実装範囲
- NextAuth.js v4のセットアップ
- Email Provider（メール認証）
- Google Provider（Google認証）
- メールベリファイ機能
- セッション管理
- 認証ミドルウェア
- ログイン/ログアウトページ

### 1.3 技術スタック
- **認証ライブラリ**: NextAuth.js v4
- **データベースアダプター**: Prisma Adapter（またはカスタムアダプター）
- **データベース**: Vercel Postgres（`reno_users`テーブル）
- **メール送信**: SendGrid（確定）

---

## 2. 実装フェーズ

### フェーズ1: 環境準備
1. 必要なパッケージのインストール
2. 環境変数の設定
3. データベーススキーマの確認・作成

### フェーズ2: NextAuth.jsの基本設定
1. NextAuth.jsのインストール
2. API Routeの作成（`/api/auth/[...nextauth]`）
3. 基本設定ファイルの作成

### フェーズ3: データベースアダプターの実装
1. Prismaスキーマの作成（またはカスタムアダプター）
2. `reno_users`テーブルとの連携
3. テーブル名のカスタマイズ（`@@map`）

### フェーズ4: 認証プロバイダーの実装
1. Email Providerの設定
2. Google Providerの設定
3. メール送信設定

### フェーズ5: UI実装
1. ログインページの作成
2. ログアウト機能の実装
3. 認証状態の表示

### フェーズ6: 認証ミドルウェアの実装
1. 認証チェックミドルウェアの作成
2. 保護されたルートの設定
3. リダイレクト処理

### フェーズ7: テストと確認
1. メール認証のテスト
2. Google認証のテスト
3. セッション管理のテスト
4. エラーハンドリングのテスト

---

## 3. 必要なパッケージ

### 3.1 必須パッケージ
```json
{
  "dependencies": {
    "next-auth": "^4.24.11",
    "@prisma/client": "^5.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0"
  }
}
```

### 3.2 メール送信パッケージ（SendGrid）
```json
{
  "dependencies": {
    "@sendgrid/mail": "^8.1.0"
  }
}
```

---

## 4. データベーススキーマ

### 4.1 reno_usersテーブル

```sql
CREATE TABLE reno_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified TIMESTAMP(6),  -- NextAuth.jsの要件によりTIMESTAMP型を使用
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    image_url VARCHAR(2000)
);

CREATE INDEX idx_reno_users_email ON reno_users(email);
CREATE INDEX idx_reno_users_google_id ON reno_users(google_id);
```

**注意**: 
- `created_at`と`updated_at`カラムは含まれていません。`02_SOLUTION_DESIGN.md`の定義に合わせています。
- `email_verified`は`TIMESTAMP(6)`型です。NextAuth.jsのPrismaアダプターが`DateTime?`型を期待するため、`BOOLEAN`型ではなく`TIMESTAMP`型を使用します。メール認証が完了した日時を記録します（未認証の場合は`NULL`）。

### 4.2 NextAuth.js用の追加テーブル

NextAuth.jsは以下のテーブルも必要とします（Prismaアダプター使用時）：

```sql
-- アカウントテーブル（OAuthプロバイダー情報）
CREATE TABLE reno_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES reno_users(user_id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX idx_reno_accounts_user_id ON reno_accounts(user_id);

-- セッションテーブル
CREATE TABLE reno_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES reno_users(user_id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
);

CREATE INDEX idx_reno_sessions_user_id ON reno_sessions(user_id);

-- 認証トークンテーブル（メール認証用）
CREATE TABLE reno_verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);
```

### 4.3 Prismaスキーマ

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  emailVerified DateTime? @map("email_verified") @db.Timestamp(6)  -- NextAuth.jsの要件によりDateTime?型を使用
  name          String?
  googleId      String?   @unique @map("google_id")
  image         String?   @map("image_url")
  
  accounts      Account[]
  sessions      Session[]

  @@map("reno_users")
}
```

**注意**: 
- `createdAt`と`updatedAt`フィールドは含まれていません。`02_SOLUTION_DESIGN.md`の定義に合わせています。
- `emailVerified`は`DateTime?`型です。NextAuth.jsのPrismaアダプターが`DateTime?`型を期待するため、`Boolean?`型ではなく`DateTime?`型を使用します。メール認証が完了した日時を記録します（未認証の場合は`NULL`）。

model Account {
  id                String  @id @default(uuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        BigInt?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("reno_accounts")
}

model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("reno_sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("reno_verification_tokens")
}
```

---

## 5. 環境変数の設定

### 5.1 必須環境変数

`.env.local`ファイルに以下を設定：

```bash
# データベース接続
POSTGRES_URL="postgresql://..."

# NextAuth.js設定
NEXTAUTH_URL="http://localhost:3050"
NEXTAUTH_SECRET="your-secret-key-here"  # openssl rand -base64 32 で生成

# Google認証
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# メール送信（SendGrid）
SENDGRID_API_KEY="your-sendgrid-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

### 5.2 環境変数の生成方法

#### NEXTAUTH_SECRETの生成
```bash
openssl rand -base64 32
```

#### Google認証の設定
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth 2.0認証情報を作成
3. 承認済みのリダイレクトURIに以下を追加：
   - `http://localhost:3050/api/auth/callback/google`
   - 本番環境のURLも追加

#### SendGridの設定
1. [SendGrid](https://sendgrid.com/)でアカウントを作成
2. APIキーを作成：
   - SendGridダッシュボード → Settings → API Keys
   - "Create API Key"をクリック
   - 権限は"Full Access"または"Mail Send"を選択
   - 生成されたAPIキーを`.env.local`の`SENDGRID_API_KEY`に設定
3. 送信者認証（Sender Authentication）：
   - Single Sender VerificationまたはDomain Authenticationを設定
   - 認証済みのメールアドレスを`EMAIL_FROM`に設定
4. メール送信の確認：
   - SendGridダッシュボードでメール送信ログを確認
   - エラーが発生した場合は、Activity Feedで詳細を確認

---

## 6. 実装手順（詳細）

### 6.1 フェーズ1: 環境準備

#### ステップ1: パッケージのインストール
```bash
npm install next-auth@^4.24.11 @prisma/client @sendgrid/mail
npm install -D prisma
```

#### ステップ2: Prismaの初期化
```bash
npx prisma init
```

#### ステップ3: データベーススキーマの作成
1. `prisma/schema.prisma`を上記のスキーマで更新
2. マイグレーション実行：
```bash
npx prisma migrate dev --name init_auth
```
3. Prisma Clientの生成：
```bash
npx prisma generate
```

### 6.2 フェーズ2: NextAuth.jsの基本設定

#### ステップ1: SendGridメール送信関数の作成

`lib/sendgrid.ts`を作成：

```typescript
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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
  const msg = {
    to,
    from: process.env.EMAIL_FROM!,
    subject,
    text: text || html.replace(/<[^>]*>/g, ''),
    html,
  };

  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
```

#### ステップ2: API Routeの作成

`app/api/auth/[...nextauth]/route.ts`を作成：

```typescript
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { sendEmail } from '@/lib/sendgrid';

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY!,
        },
      },
      from: process.env.EMAIL_FROM!,
      // カスタムメール送信関数を使用する場合（オプション）
      // sendVerificationRequest: async ({ identifier, url, provider }) => {
      //   await sendEmail({
      //     to: identifier,
      //     subject: 'レノちゃん - ログインリンク',
      //     html: `
      //       <h1>ログインリンク</h1>
      //       <p>以下のリンクをクリックしてログインしてください：</p>
      //       <a href="${url}">${url}</a>
      //       <p>このリンクは24時間有効です。</p>
      //     `,
      //   });
      // },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    verifyRequest: '/verify-email',
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
  },
});

export { handler as GET, handler as POST };
```

#### ステップ2: Prisma Clientの設定

`lib/prisma.ts`を作成：

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 6.3 フェーズ3: 認証ミドルウェアの実装

#### ステップ1: ミドルウェアの作成

`middleware.ts`を作成：

```typescript
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 認証が必要なページの処理
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/recipes/:path*',
    '/profile/:path*',
    // 保護したいパスを追加
  ],
};
```

### 6.4 フェーズ4: UI実装

#### ステップ1: ログインページの作成

`app/login/page.tsx`を作成：

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn('email', { email, callbackUrl: '/recipes' });
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await signIn('google', { callbackUrl: '/recipes' });
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-2xl font-bold">ログイン</h1>
        
        {/* メール認証フォーム */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            required
            className="w-full px-4 py-2 border rounded"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isLoading ? '送信中...' : 'メールでログイン'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white">または</span>
          </div>
        </div>

        {/* Google認証ボタン */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-white border rounded flex items-center justify-center gap-2"
        >
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
}
```

#### ステップ2: セッションProviderの設定

`app/providers.tsx`を作成：

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

`app/layout.tsx`を更新：

```typescript
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 7. テスト計画

### 7.1 メール認証のテスト
- [ ] メールアドレス入力フォームの表示
- [ ] メール送信の成功
- [ ] メール内のリンククリックでログイン
- [ ] メールベリファイの確認
- [ ] 無効なトークンのエラーハンドリング

### 7.2 Google認証のテスト
- [ ] Google認証ボタンの表示
- [ ] Google認証画面へのリダイレクト
- [ ] 認証成功後のコールバック処理
- [ ] 初回ログイン時のユーザー作成
- [ ] 既存ユーザーのログイン

### 7.3 セッション管理のテスト
- [ ] ログイン後のセッション保持
- [ ] ページリロード時のセッション維持
- [ ] ログアウト機能
- [ ] セッション期限切れの処理

### 7.4 認証ミドルウェアのテスト
- [ ] 未認証ユーザーのリダイレクト
- [ ] 認証済みユーザーのアクセス許可
- [ ] 保護されたルートへのアクセス制御

---

## 8. セキュリティ考慮事項

### 8.1 実装すべきセキュリティ対策
1. **CSRF対策**: NextAuth.jsが自動的に実装
2. **セッション管理**: データベースセッションを使用
3. **パスワード**: メール認証ではパスワード不要（リンク認証）
4. **メールベリファイ**: 必須実装
5. **環境変数の保護**: `.env.local`を`.gitignore`に追加

### 8.2 推奨設定
- HTTPSの使用（本番環境）
- セッションの有効期限設定
- レート制限の実装（メール送信）
- ログイン試行回数の制限

---

## 9. トラブルシューティング

### 9.1 よくある問題

#### 問題1: メールが送信されない（SendGrid）
- **原因**: 
  - SendGrid APIキーの設定不備
  - 送信者認証（Sender Authentication）が未設定
  - APIキーの権限不足
  - レート制限に達している
- **解決策**: 
  - `.env.local`の`SENDGRID_API_KEY`が正しく設定されているか確認
  - SendGridダッシュボードでSingle Sender VerificationまたはDomain Authenticationを設定
  - APIキーの権限が"Mail Send"以上であることを確認
  - SendGridのActivity Feedでエラーログを確認
  - 送信レート制限に達していないか確認（無料プランは100通/日）

#### 問題2: Google認証が動作しない
- **原因**: リダイレクトURIの不一致、クライアントID/シークレットの誤り
- **解決策**: Google Cloud Consoleでの設定確認

#### 問題3: セッションが保持されない
- **原因**: データベース接続の問題、セッションテーブルの不備
- **解決策**: データベース接続の確認、Prismaマイグレーションの確認

#### 問題4: メールリンクをクリックしてもログイン画面に戻る / ユーザーが作成されない
- **原因**: 
  - `NEXTAUTH_URL`環境変数が設定されていない（メール内のリンクが正しく生成されない）
  - `EmailProvider`の設定で`server`オプションと`sendVerificationRequest`を同時に使用している
  - Prismaアダプターが正しく動作していない
  - **`emailVerified`フィールドの型不一致**: NextAuth.jsは`DateTime?`型を期待するが、Prismaスキーマで`Boolean?`型に設定されている
- **解決策**: 
  1. `.env.local`に`NEXTAUTH_URL`を設定（例: `NEXTAUTH_URL="http://localhost:3050"`）
  2. `NEXTAUTH_SECRET`も設定されているか確認（`openssl rand -base64 32`で生成）
  3. `EmailProvider`の設定で`server`オプションを削除し、`sendVerificationRequest`のみを使用
  4. **Prismaスキーマの`emailVerified`を`DateTime?`型に変更**:
     ```prisma
     emailVerified DateTime? @map("email_verified") @db.Timestamp(6)
     ```
  5. データベースマイグレーションを実行して`email_verified`カラムを`BOOLEAN`から`TIMESTAMP`に変更
  6. Prisma Clientを再生成: `npx prisma generate`
  7. 開発環境では`debug: true`を設定してログを確認
  8. データベースの`reno_verification_tokens`テーブルにトークンが保存されているか確認
  9. Prismaアダプターが正しく初期化されているか確認（`lib/prisma.ts`）

### 9.2 デバッグ方法
1. NextAuth.jsのデバッグモードを有効化：
```typescript
debug: process.env.NODE_ENV === 'development',
```
2. ブラウザの開発者ツールでセッション情報を確認
3. データベースのテーブル内容を確認

---

## 10. 実装チェックリスト

### 環境準備
- [ ] パッケージのインストール（next-auth, @prisma/client, @sendgrid/mail）
- [ ] Prismaの初期化
- [ ] データベーススキーマの作成
- [ ] 環境変数の設定（NEXTAUTH_SECRET, NEXTAUTH_URL, SENDGRID_API_KEY, EMAIL_FROM）
- [ ] SendGridのAPIキー作成と設定
- [ ] SendGridの送信者認証（Sender Authentication）設定

### NextAuth.js設定
- [ ] SendGridメール送信関数の作成（lib/sendgrid.ts）
- [ ] API Routeの作成
- [ ] Prismaアダプターの設定
- [ ] Email Providerの設定（SendGrid SMTP設定）
- [ ] Google Providerの設定

### UI実装
- [ ] ログインページの作成
- [ ] ログアウト機能の実装
- [ ] セッションProviderの設定
- [ ] 認証状態の表示

### ミドルウェア
- [ ] 認証ミドルウェアの実装
- [ ] 保護されたルートの設定
- [ ] リダイレクト処理

### テスト
- [ ] メール認証のテスト
- [ ] Google認証のテスト
- [ ] セッション管理のテスト
- [ ] エラーハンドリングのテスト

---

## 11. 参考資料

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth.js Prisma Adapter](https://next-auth.js.org/adapters/prisma)
- [NextAuth.js Email Provider](https://next-auth.js.org/providers/email)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Prisma Documentation](https://www.prisma.io/docs)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [SendGrid SMTP Settings](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)

---

## 12. 更新履歴

- 2024-XX-XX: 初版作成
- 2024-XX-XX: SendGridメール送信設定を追加
- 2024-XX-XX: メール認証の不具合修正（EmailProviderの設定修正、NEXTAUTH_URLの重要性を追記）

