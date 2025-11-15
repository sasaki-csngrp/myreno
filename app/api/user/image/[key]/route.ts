import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getImageFromS3 } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
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

    // paramsをawaitしてからアクセス
    const resolvedParams = await params;
    // URLデコード
    const key = decodeURIComponent(resolvedParams.key);

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

    // 画像を返す（BufferをUint8Arrayに変換）
    return new NextResponse(new Uint8Array(imageBuffer), {
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

