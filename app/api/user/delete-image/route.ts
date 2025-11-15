import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { deleteImageFromS3 } from '@/lib/s3';

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

