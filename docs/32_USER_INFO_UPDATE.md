# ユーザープロフィール画像登録・編集機能 実装プラン

## 1. 概要

### 1.1 目的
ユーザープロフィールに画像登録・編集機能を追加する。画像はAWS S3に保存し、IAMユーザー権限でproxyアクセスする。

### 1.2 背景
- 現在、プロフィールページ（`app/recipes/profile/page.tsx`）では、Google認証で取得した画像のみ表示可能
- ユーザーが独自の画像をアップロード・編集できる機能が必要
- データベースの`reno_users`テーブルには既に`image_url`カラムが存在

### 1.3 技術スタック
- **ストレージ**: AWS S3（パブリックアクセスブロック）
- **認証**: IAMユーザー（S3アクセス権限）
- **アクセス方式**: Proxy経由（サーバーサイドでIAM認証情報を使用）
- **データベース**: PostgreSQL（`reno_users.image_url`）
- **認証**: NextAuth.js（セッション管理）

### 1.4 実装範囲
- AWS S3バケットの作成と設定
- IAMユーザーの作成と権限設定
- 画像アップロードAPI（proxy経由）
- 画像削除API（proxy経由）
- プロフィール画像アップロード・編集UI
- データベース更新（`image_url`）
- NextAuth.jsセッション更新

---

## 2. AWS S3の設定

### 2.1 S3バケットの作成

#### バケット名
- 推奨: `myreno-user-images`（または環境ごとに`myreno-user-images-dev`、`myreno-user-images-prod`）

#### バケット設定
1. **リージョン**: アプリケーションに近いリージョンを選択（例: `ap-northeast-1`）
2. **パブリックアクセス設定**: **すべてブロック**
   - ✅ 新しいパブリックバケットポリシーをブロック
   - ✅ パブリックアクセスを介したバケットとオブジェクトへのクロスアカウントアクセスをブロック
   - ✅ 新しいパブリックバケットポリシーをブロック
   - ✅ パブリックアクセスを介したバケットとオブジェクトへのクロスアカウントアクセスをブロック
3. **バケットバージョニング**: 無効（または有効化して古いバージョンを自動削除）
4. **暗号化**: サーバー側暗号化（SSE-S3）を有効化
5. **オブジェクトロック**: 無効

#### バケットポリシー
パブリックアクセスをブロックしているため、バケットポリシーは設定しない（IAMユーザー権限でアクセス）

### 2.2 IAMユーザーの作成と権限設定

#### IAMユーザー名
- 推奨: `myreno-s3-upload-user`（または環境ごとに`myreno-s3-upload-user-dev`）

#### 既存のIAMポリシーをアタッチ

1. **IAMユーザーの作成**
   - AWSコンソール → IAM → ユーザー → ユーザーを追加
   - ユーザー名: `myreno-s3-upload-user`
   - アクセスの種類: 「プログラムによるアクセス」を選択

2. **既存のポリシーをアタッチ**
   - 「既存のポリシーを直接アタッチ」を選択
   - 以下のいずれかの既存ポリシーを選択：
     - **推奨**: `AmazonS3FullAccess`（S3へのフルアクセス）
     - または、より制限された既存のポリシー（例: 特定のバケットのみアクセス可能なポリシー）
   - 既に作成済みのカスタムポリシーがある場合は、そのポリシーを選択

3. **アクセスキーの生成・保存**
   - ユーザー作成後、アクセスキーIDとシークレットアクセスキーを生成
   - **重要**: アクセスキーは一度しか表示されないため、必ず保存すること

#### 注意事項
- `AmazonS3FullAccess`を使用する場合、すべてのS3バケットへのアクセス権限が付与されます
- よりセキュアな運用を希望する場合は、特定のバケットのみアクセス可能な既存のカスタムポリシーを使用することを推奨します

---

## 3. 環境変数の設定

### 3.1 追加する環境変数

`.env.local`ファイルに以下を追加：

```bash
# AWS S3設定
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET_NAME=myreno-user-images
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 3.2 環境変数の説明

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `AWS_REGION` | S3バケットのリージョン | `ap-northeast-1` |
| `AWS_S3_BUCKET_NAME` | S3バケット名 | `myreno-user-images` |
| `AWS_ACCESS_KEY_ID` | IAMユーザーのアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | IAMユーザーのシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### 3.3 Vercel環境変数の設定

本番環境（Vercel）でも同様の環境変数を設定：
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 上記4つの環境変数を追加

---

## 4. 実装フェーズ

### フェーズ1: AWS S3の設定 ✅ 手動作業

1. **S3バケットの作成**
   - バケット名: `myreno-user-images`
   - パブリックアクセス: すべてブロック
   - リージョン: `ap-northeast-1`（推奨）

2. **IAMユーザーの作成**
   - ユーザー名: `myreno-s3-upload-user`
   - カスタムポリシーをアタッチ
   - アクセスキーを生成・保存

3. **環境変数の設定**
   - `.env.local`に4つの環境変数を追加
   - Vercel環境変数も設定

**推定作業時間**: 30分〜1時間

---

### フェーズ2: 依存関係のインストール

#### 必要なパッケージ

```bash
npm install @aws-sdk/client-s3
npm install @aws-sdk/s3-request-presigner  # 必要に応じて（今回は使用しない）
```

**推定作業時間**: 5分

---

### フェーズ3: バックエンドAPIの実装

#### 3.1 AWS S3クライアントの作成

**ファイル**: `lib/s3.ts`（新規作成）

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// S3クライアントのシングルトンインスタンス
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

// 画像アップロード
export async function uploadImageToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // S3のURLを返す（パブリックアクセスがブロックされているため、proxy経由でアクセス）
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// 画像取得（proxy経由で使用）
export async function getImageFromS3(key: string): Promise<Buffer> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('画像が見つかりません');
  }

  // BodyをBufferに変換
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// 画像削除
export async function deleteImageFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}
```

#### 3.2 画像アップロードAPI

**ファイル**: `app/api/user/upload-image/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { uploadImageToS3, deleteImageFromS3 } from '@/lib/s3';
import sharp from 'sharp'; // 画像リサイズ用（必要に応じて）

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // FormDataから画像を取得
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: '画像ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルのみアップロード可能です' },
        { status: 400 }
      );
    }

    // ファイルサイズの検証（例: 5MB以下）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '画像サイズは5MB以下である必要があります' },
        { status: 400 }
      );
    }

    // 画像をBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    let imageBuffer = Buffer.from(arrayBuffer);

    // 画像リサイズ（オプション: 最大1000x1000px）
    imageBuffer = await sharp(imageBuffer)
      .resize(1000, 1000, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // S3キーを生成（ユーザーID + タイムスタンプ）
    const timestamp = Date.now();
    const extension = 'jpg'; // リサイズ後は常にJPEG
    const key = `user-images/${session.user.id}/${timestamp}.${extension}`;

    // 既存の画像を削除（オプション: 古い画像を保持する場合はスキップ）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    if (user?.image) {
      // S3のURLからキーを抽出
      const oldKey = extractS3KeyFromUrl(user.image);
      if (oldKey) {
        try {
          await deleteImageFromS3(oldKey);
        } catch (error) {
          console.error('古い画像の削除に失敗:', error);
          // エラーが発生しても続行
        }
      }
    }

    // S3にアップロード
    const s3Url = await uploadImageToS3(key, imageBuffer, 'image/jpeg');

    // データベースを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: s3Url },
    });

    return NextResponse.json({
      success: true,
      imageUrl: s3Url,
    });
  } catch (error) {
    console.error('画像アップロードエラー:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

// S3のURLからキーを抽出するヘルパー関数
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // https://bucket-name.s3.region.amazonaws.com/key の形式からキーを抽出
    const pathname = urlObj.pathname;
    if (pathname.startsWith('/')) {
      return pathname.substring(1);
    }
    return pathname;
  } catch {
    return null;
  }
}
```

**注意**: `sharp`パッケージが必要な場合:
```bash
npm install sharp
```

#### 3.3 画像削除API

**ファイル**: `app/api/user/delete-image/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { deleteImageFromS3 } from '@/lib/s3';

export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 現在のユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    if (!user?.image) {
      return NextResponse.json(
        { error: '削除する画像がありません' },
        { status: 404 }
      );
    }

    // S3のURLからキーを抽出
    const key = extractS3KeyFromUrl(user.image);
    if (!key) {
      return NextResponse.json(
        { error: '無効な画像URLです' },
        { status: 400 }
      );
    }

    // S3から画像を削除
    try {
      await deleteImageFromS3(key);
    } catch (error) {
      console.error('S3からの画像削除に失敗:', error);
      // エラーが発生しても続行（データベースは更新）
    }

    // データベースを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('画像削除エラー:', error);
    return NextResponse.json(
      { error: '画像の削除に失敗しました' },
      { status: 500 }
    );
  }
}

// S3のURLからキーを抽出するヘルパー関数
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    if (pathname.startsWith('/')) {
      return pathname.substring(1);
    }
    return pathname;
  } catch {
    return null;
  }
}
```

#### 3.4 画像取得API（Proxy経由）

**ファイル**: `app/api/user/image/[key]/route.ts`（新規作成）

パブリックアクセスがブロックされているため、S3の画像をproxy経由で取得するAPI。

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getImageFromS3 } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    // 認証チェック（オプション: パブリックアクセスを許可する場合は削除）
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // URLデコード
    const key = decodeURIComponent(params.key);

    // S3から画像を取得
    const imageBuffer = await getImageFromS3(key);

    // Content-Typeを推測（キーから拡張子を取得）
    const extension = key.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg';
    if (extension === 'png') {
      contentType = 'image/png';
    } else if (extension === 'gif') {
      contentType = 'image/gif';
    } else if (extension === 'webp') {
      contentType = 'image/webp';
    }

    // 画像を返す
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('画像取得エラー:', error);
    return NextResponse.json(
      { error: '画像の取得に失敗しました' },
      { status: 500 }
    );
  }
}
```

**推定作業時間**: 2〜3時間

---

### フェーズ4: フロントエンドUIの実装

#### 4.1 プロフィール画像アップロードコンポーネント

**ファイル**: `app/components/ProfileImageUpload.tsx`（新規作成）

```typescript
'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { User, Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate?: (imageUrl: string | null) => void;
}

export default function ProfileImageUpload({
  currentImageUrl,
  onImageUpdate,
}: ProfileImageUploadProps) {
  const { data: session, update } = useSession();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルのみアップロード可能です');
      return;
    }

    // ファイルサイズの検証（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズは5MB以下である必要があります');
      return;
    }

    // プレビューを表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // アップロード
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      
      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl,
        },
      });

      // 親コンポーネントに通知
      if (onImageUpdate) {
        onImageUpdate(data.imageUrl);
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました');
      // プレビューをリセット
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('プロフィール画像を削除しますか？')) {
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/user/delete-image', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          image: null,
        },
      });

      // プレビューをリセット
      setPreview(null);

      // 親コンポーネントに通知
      if (onImageUpdate) {
        onImageUpdate(null);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 画像プレビュー */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
          {preview ? (
            <Image
              src={preview}
              alt="プロフィール画像"
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-16 h-16 text-gray-500 dark:text-gray-400" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <label
          htmlFor="image-upload"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          {preview ? '画像を変更' : '画像をアップロード'}
        </label>
        <input
          id="image-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        {preview && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            削除
          </button>
        )}
      </div>
    </div>
  );
}
```

#### 4.2 プロフィールページの更新

**ファイル**: `app/recipes/profile/page.tsx`（更新）

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutButton from '../logout-button';
import ProfileImageUpload from '@/app/components/ProfileImageUpload';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 pt-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-6">
          ユーザープロフィール
        </h1>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-zinc-700">
          {/* プロフィール画像アップロード */}
          <div className="mb-6">
            <ProfileImageUpload currentImageUrl={session.user?.image || null} />
          </div>

          {/* ユーザー情報 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ユーザー名
              </label>
              <p className="mt-1 text-gray-900 dark:text-zinc-50">
                {session.user?.name || '未設定'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                メールアドレス
              </label>
              <p className="mt-1 text-gray-900 dark:text-zinc-50">
                {session.user?.email || '未設定'}
              </p>
            </div>
          </div>

          {/* ログアウトボタン */}
          <div className="pt-6 border-t border-gray-200 dark:border-zinc-700">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**推定作業時間**: 2〜3時間

---

### フェーズ5: セッション更新の実装

NextAuth.jsのJWTセッションを使用しているため、画像更新後にセッションを更新する必要があります。

#### 5.1 セッション更新の確認

`app/api/user/upload-image/route.ts`と`app/components/ProfileImageUpload.tsx`で既に実装済み：
- `useSession().update()`を使用してセッションを更新
- NextAuth.jsのJWTコールバックで`image`がセッションに含まれることを確認

#### 5.2 NextAuth.jsコールバックの確認

`app/api/auth/[...nextauth]/route.ts`の`jwt`コールバックと`session`コールバックで`image`が正しく処理されていることを確認（既に実装済み）。

**推定作業時間**: 30分（確認のみ）

---

## 5. セキュリティ考慮事項

### 5.1 ファイルタイプの検証
- サーバーサイドでファイルタイプを検証（MIMEタイプ）
- クライアントサイドでも検証（UX向上）

### 5.2 ファイルサイズの制限
- 最大5MBに制限
- リサイズ処理でさらに最適化

### 5.3 認証チェック
- すべてのAPIエンドポイントで認証チェック
- 自分の画像のみアップロード・削除可能

### 5.4 S3アクセス制御
- パブリックアクセスをブロック
- IAMユーザー権限で最小権限の原則を適用
- Proxy経由でアクセス（直接S3 URLを公開しない）

### 5.5 画像リサイズ
- アップロード時に自動リサイズ（最大1000x1000px）
- JPEG形式に統一（品質85%）

### 5.6 古い画像の削除
- 新しい画像をアップロードする際、古い画像をS3から削除
- ストレージコストの削減

---

## 6. テスト計画

### 6.1 単体テスト
- [ ] S3クライアントの動作確認
- [ ] 画像アップロードAPIの動作確認
- [ ] 画像削除APIの動作確認
- [ ] 画像取得API（Proxy）の動作確認
- [ ] ファイルタイプ検証の動作確認
- [ ] ファイルサイズ検証の動作確認

### 6.2 統合テスト
- [ ] プロフィール画像のアップロード
- [ ] プロフィール画像の変更
- [ ] プロフィール画像の削除
- [ ] セッション更新の確認
- [ ] データベース更新の確認
- [ ] S3への画像保存の確認

### 6.3 エッジケーステスト
- [ ] 無効なファイルタイプのアップロード
- [ ] 5MBを超えるファイルのアップロード
- [ ] 認証なしでのアクセス
- [ ] ネットワークエラー時の処理
- [ ] S3アクセスエラー時の処理

### 6.4 UI/UXテスト
- [ ] 画像プレビューの表示
- [ ] アップロード中のローディング表示
- [ ] エラーメッセージの表示
- [ ] レスポンシブデザインの確認

---

## 7. 実装チェックリスト

### 実装前
- [ ] AWS S3バケットの作成
- [ ] IAMユーザーの作成と権限設定
- [ ] 環境変数の設定（`.env.local`、Vercel）
- [ ] 依存関係のインストール

### 実装中
- [ ] `lib/s3.ts`の作成
- [ ] `app/api/user/upload-image/route.ts`の作成
- [ ] `app/api/user/delete-image/route.ts`の作成
- [ ] `app/api/user/image/[key]/route.ts`の作成
- [ ] `app/components/ProfileImageUpload.tsx`の作成
- [ ] `app/recipes/profile/page.tsx`の更新

### 実装後
- [ ] 単体テストの実施
- [ ] 統合テストの実施
- [ ] エッジケーステストの実施
- [ ] UI/UXテストの実施
- [ ] 本番環境での動作確認

---

## 8. 推定作業時間

| フェーズ | 作業内容 | 推定時間 |
|---------|---------|---------|
| フェーズ1 | AWS S3の設定 | 30分〜1時間 |
| フェーズ2 | 依存関係のインストール | 5分 |
| フェーズ3 | バックエンドAPIの実装 | 2〜3時間 |
| フェーズ4 | フロントエンドUIの実装 | 2〜3時間 |
| フェーズ5 | セッション更新の実装 | 30分 |
| テスト | 各種テストの実施 | 2〜3時間 |
| **合計** | | **7〜10時間** |

---

## 9. 参考資料

- AWS S3ドキュメント: https://docs.aws.amazon.com/s3/
- AWS SDK for JavaScript v3: https://docs.aws.amazon.com/sdk-for-javascript/v3/
- NextAuth.jsドキュメント: https://next-auth.js.org/
- Sharp（画像リサイズ）: https://sharp.pixelplumbing.com/

---

## 10. 注意事項

### 10.1 画像URLの扱い
- S3のURLは直接公開しない（パブリックアクセスがブロックされているため）
- Proxy経由でアクセスする場合は、`/api/user/image/[key]`を使用
- または、CloudFrontなどのCDNを使用してアクセス制御

### 10.2 ストレージコスト
- S3のストレージコストを定期的に確認
- 古い画像の自動削除を検討（ライフサイクルポリシー）

### 10.3 パフォーマンス
- 画像リサイズ処理はサーバーリソースを消費するため、必要に応じて最適化
- 大量のアップロードがある場合は、キューイングシステムの導入を検討

### 10.4 エラーハンドリング
- S3アクセスエラー時の適切なエラーメッセージ
- ネットワークエラー時のリトライ処理

---

## 11. 今後の拡張案

### 11.1 画像の最適化
- WebP形式への変換
- 複数サイズの生成（サムネイル、中サイズ、大サイズ）
- 遅延読み込み（Lazy Loading）

### 11.2 CDNの導入
- CloudFrontなどのCDNを使用して画像配信を高速化
- キャッシュ戦略の最適化

### 11.3 画像編集機能
- クロップ機能
- フィルター機能
- 回転機能

### 11.4 バックアップ
- 画像のバックアップ戦略
- 災害復旧計画

