# 認証実装詳細プラン

## 1. 概要

### 1.1 目的
レノちゃんアプリケーションにNextAuth.jsを使用した認証機能を実装する。
メールアドレス＋パスワード認証とGoogle認証をサポートし、初回登録時のみメールベリファイ機能を含む。

### 1.2 実装範囲
- NextAuth.js v4のセットアップ
- Credentials Provider（メールアドレス＋パスワード認証）
- Google Provider（Google認証）
- 初回登録時のみメールベリファイ機能
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
1. Credentials Providerの設定（メールアドレス＋パスワード）
2. Google Providerの設定
3. 初回登録時のメールベリファイ送信設定

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
    "@prisma/client": "^5.0.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "@types/bcryptjs": "^2.4.6"
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
    password VARCHAR(255),  -- ハッシュ化されたパスワード（メール認証ユーザーのみ）
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
  password      String?   -- ハッシュ化されたパスワード（メール認証ユーザーのみ）
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

#### ステップ2: パスワードハッシュ化ユーティリティの作成

`lib/password.ts`を作成：

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
```

#### ステップ3: メールベリファイトークン生成関数の作成

`lib/verification.ts`を作成：

```typescript
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function generateVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間有効

  // 既存のトークンを削除
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // 新しいトークンを作成
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}
```

#### ステップ4: API Routeの作成

`app/api/auth/[...nextauth]/route.ts`を作成：

```typescript
import NextAuth, { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { verifyPassword } from '@/lib/password';
import { sendEmail } from '@/lib/sendgrid';
import { generateVerificationToken } from '@/lib/verification';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('メールアドレスとパスワードを入力してください');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        // パスワードが設定されていない場合（Google認証のみのユーザー）
        if (!user.password) {
          throw new Error('このメールアドレスはGoogle認証で登録されています。Googleでログインしてください。');
        }

        // パスワード検証
        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = user?.id || token.sub;
        // emailVerifiedの状態をセッションに含める
        if (user) {
          session.user.emailVerified = user.emailVerified;
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

#### ステップ5: メールベリファイAPI Routeの作成

`app/api/auth/verify-email/route.ts`を作成：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  if (!token || !email) {
    return NextResponse.redirect(
      new URL('/login?error=InvalidVerificationToken', request.url)
    );
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL('/login?error=InvalidVerificationToken', request.url)
      );
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.redirect(
        new URL('/login?error=ExpiredVerificationToken', request.url)
      );
    }

    // メールアドレスを確認済みに更新
    await prisma.user.update({
      where: { email: email },
      data: { emailVerified: new Date() },
    });

    // 使用済みトークンを削除
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    return NextResponse.redirect(
      new URL('/login?verified=true', request.url)
    );
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(
      new URL('/login?error=VerificationFailed', request.url)
    );
  }
}
```

#### ステップ6: ユーザー登録API Routeの作成

`app/api/auth/register/route.ts`を作成：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { generateVerificationToken } from '@/lib/verification';
import { sendEmail } from '@/lib/sendgrid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    // 既存ユーザーのチェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    // ユーザーを作成
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        emailVerified: null, // 初回は未確認
      },
    });

    // メールベリファイトークンを生成して送信
    try {
      const token = await generateVerificationToken(email);
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      
      await sendEmail({
        to: email,
        subject: 'レノちゃん - メールアドレス確認',
        html: `
          <h1>メールアドレス確認</h1>
          <p>ご登録ありがとうございます！</p>
          <p>以下のリンクをクリックしてメールアドレスを確認してください：</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>このリンクは24時間有効です。</p>
          <p>このメールに心当たりがない場合は、無視してください。</p>
        `,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // メール送信に失敗してもユーザー作成は成功とする
    }

    return NextResponse.json(
      { message: 'ユーザーが作成されました。確認メールを送信しました。' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました' },
      { status: 500 }
    );
  }
}
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
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLパラメータからメッセージを取得
  const verified = searchParams.get('verified');
  const errorParam = searchParams.get('error');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/recipes',
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/recipes');
      }
    } catch (err) {
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    await signIn('google', { callbackUrl: '/recipes' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-2xl font-bold">ログイン</h1>

        {verified && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            メールアドレスが確認されました。ログインしてください。
          </div>
        )}

        {errorParam && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {errorParam === 'InvalidVerificationToken' && '無効な確認トークンです。'}
            {errorParam === 'ExpiredVerificationToken' && '確認トークンの有効期限が切れています。'}
            {errorParam === 'VerificationFailed' && 'メールアドレスの確認に失敗しました。'}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}
        
        {/* メールアドレス＋パスワード認証フォーム */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
              className="mt-1 w-full px-4 py-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              disabled={isLoading}
              className="mt-1 w-full px-4 py-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/register" className="text-blue-500 hover:underline">
            アカウントをお持ちでない方はこちら
          </Link>
        </div>

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
          className="w-full px-4 py-2 bg-white border rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
}
```

#### ステップ2: ユーザー登録ページの作成

`app/register/page.tsx`を作成：

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登録に失敗しました');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login?registered=true');
        }, 2000);
      }
    } catch (err) {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-2xl font-bold">新規登録</h1>

        {success && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
            登録が完了しました。確認メールを送信しました。メール内のリンクをクリックしてメールアドレスを確認してください。
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              名前（任意）
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              disabled={isLoading}
              className="mt-1 w-full px-4 py-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
              className="mt-1 w-full px-4 py-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              required
              minLength={8}
              disabled={isLoading}
              className="mt-1 w-full px-4 py-2 border rounded"
            />
            <p className="mt-1 text-xs text-gray-500">
              パスワードは8文字以上で入力してください
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {isLoading ? '登録中...' : '登録'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/login" className="text-blue-500 hover:underline">
            既にアカウントをお持ちの方はこちら
          </Link>
        </div>
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

### 7.1 メールアドレス＋パスワード認証のテスト
- [ ] ユーザー登録フォームの表示
- [ ] 新規ユーザー登録の成功
- [ ] 初回登録時のメールベリファイメール送信
- [ ] メール内のリンククリックでメールアドレス確認
- [ ] パスワードログインの成功
- [ ] 間違ったパスワードでのエラーハンドリング
- [ ] 無効なトークンのエラーハンドリング
- [ ] 既存ユーザーの再ログイン時はメール送信されないことの確認

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
3. **パスワード**: bcryptjsを使用してハッシュ化（salt rounds: 10）
4. **メールベリファイ**: 初回登録時のみ送信（SendGridの送信制限対策）
5. **環境変数の保護**: `.env.local`を`.gitignore`に追加
6. **パスワード強度**: 最低8文字以上を要求
7. **レート制限**: ログイン試行回数の制限（推奨）

### 8.2 推奨設定
- HTTPSの使用（本番環境）
- セッションの有効期限設定
- レート制限の実装（ログイン試行回数）
- パスワード強度チェック（8文字以上、大文字・小文字・数字・記号を含む）
- メール送信のレート制限（SendGrid無料版は100通/日）

---

## 9. トラブルシューティング

### 9.1 よくある問題

#### 問題1: メールが送信されない（SendGrid）
- **原因**: 
  - SendGrid APIキーの設定不備
  - 送信者認証（Sender Authentication）が未設定
  - APIキーの権限不足
  - レート制限に達している（無料プランは100通/日）
- **解決策**: 
  - `.env.local`の`SENDGRID_API_KEY`が正しく設定されているか確認
  - SendGridダッシュボードでSingle Sender VerificationまたはDomain Authenticationを設定
  - APIキーの権限が"Mail Send"以上であることを確認
  - SendGridのActivity Feedでエラーログを確認
  - 送信レート制限に達していないか確認（無料プランは100通/日）
  - **重要**: 初回登録時のみメールを送信する仕様により、通常のログインではメール送信されないため、送信制限に達しにくくなっています

#### 問題2: Google認証が動作しない
- **原因**: リダイレクトURIの不一致、クライアントID/シークレットの誤り
- **解決策**: Google Cloud Consoleでの設定確認

#### 問題3: セッションが保持されない
- **原因**: データベース接続の問題、セッションテーブルの不備
- **解決策**: データベース接続の確認、Prismaマイグレーションの確認

#### 問題4: メールベリファイリンクをクリックしてもエラーになる
- **原因**: 
  - `NEXTAUTH_URL`環境変数が設定されていない（メール内のリンクが正しく生成されない）
  - トークンの有効期限切れ
  - トークンが既に使用済み
  - Prismaアダプターが正しく動作していない
- **解決策**: 
  1. `.env.local`に`NEXTAUTH_URL`を設定（例: `NEXTAUTH_URL="http://localhost:3050"`）
  2. `NEXTAUTH_SECRET`も設定されているか確認（`openssl rand -base64 32`で生成）
  3. データベースの`reno_verification_tokens`テーブルにトークンが保存されているか確認
  4. トークンの有効期限（24時間）を確認
  5. Prisma Clientを再生成: `npx prisma generate`
  6. 開発環境では`debug: true`を設定してログを確認

#### 問題5: パスワードログインが失敗する
- **原因**: 
  - パスワードのハッシュ化に失敗している
  - パスワード検証ロジックの不備
  - ユーザーが存在しない、またはパスワードが設定されていない
- **解決策**: 
  1. `bcryptjs`が正しくインストールされているか確認
  2. パスワードハッシュ化関数（`hashPassword`）が正しく動作しているか確認
  3. パスワード検証関数（`verifyPassword`）が正しく動作しているか確認
  4. データベースの`password`カラムにハッシュ化されたパスワードが保存されているか確認
  5. Google認証で登録したユーザーはパスワードが設定されていないため、Credentials認証ではログインできない（正常な動作）

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
- [ ] パッケージのインストール（next-auth, @prisma/client, @sendgrid/mail, bcryptjs, @types/bcryptjs）
- [ ] Prismaの初期化
- [ ] データベーススキーマの作成（passwordフィールドを含む）
- [ ] 環境変数の設定（NEXTAUTH_SECRET, NEXTAUTH_URL, SENDGRID_API_KEY, EMAIL_FROM）
- [ ] SendGridのAPIキー作成と設定
- [ ] SendGridの送信者認証（Sender Authentication）設定

### NextAuth.js設定
- [ ] SendGridメール送信関数の作成（lib/sendgrid.ts）
- [ ] パスワードハッシュ化ユーティリティの作成（lib/password.ts）
- [ ] メールベリファイトークン生成関数の作成（lib/verification.ts）
- [ ] API Routeの作成（app/api/auth/[...nextauth]/route.ts）
- [ ] メールベリファイAPI Routeの作成（app/api/auth/verify-email/route.ts）
- [ ] ユーザー登録API Routeの作成（app/api/auth/register/route.ts）
- [ ] Prismaアダプターの設定
- [ ] Credentials Providerの設定（メールアドレス＋パスワード）
- [ ] Google Providerの設定

### UI実装
- [ ] ログインページの作成（メールアドレス＋パスワード入力）
- [ ] ユーザー登録ページの作成
- [ ] ログアウト機能の実装
- [ ] セッションProviderの設定
- [ ] 認証状態の表示

### ミドルウェア
- [ ] 認証ミドルウェアの実装
- [ ] 保護されたルートの設定
- [ ] リダイレクト処理

### テスト
- [ ] メールアドレス＋パスワード認証のテスト
- [ ] 初回登録時のメールベリファイ送信のテスト
- [ ] 再ログイン時のメール送信が行われないことの確認
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

## 12. 認証フローの変更点

### 12.1 変更前（Email Provider）
- 毎回ログイン時にメール認証リンクを送信
- SendGridの送信制限（100通/日）に達しやすい
- パスワード不要

### 12.2 変更後（Credentials Provider）
- メールアドレス＋パスワードでログイン
- 初回登録時のみメールベリファイメールを送信
- 再ログイン時はメール送信なし（SendGridの送信制限対策）
- パスワードはbcryptjsでハッシュ化して保存

### 12.3 実装のポイント
1. **初回登録時**: ユーザー作成後、メールベリファイトークンを生成してメール送信
2. **再ログイン時**: パスワード検証のみでログイン（メール送信なし）
3. **メールベリファイ**: メール内のリンクをクリックすると`emailVerified`が更新される
4. **Google認証**: 既存の動作を維持（メールベリファイ不要）

---

## 13. 更新履歴

- 2024-XX-XX: 初版作成
- 2024-XX-XX: SendGridメール送信設定を追加
- 2024-XX-XX: メール認証の不具合修正（EmailProviderの設定修正、NEXTAUTH_URLの重要性を追記）
- 2024-XX-XX: Email ProviderからCredentials Providerに変更。初回登録時のみメールベリファイを送信する仕様に変更（SendGrid送信制限対策）

