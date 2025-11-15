import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { uploadImageToS3, deleteImageFromS3 } from '@/lib/s3';
import sharp from 'sharp';

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
    const buffer = Buffer.from(arrayBuffer) as Buffer;

    // 画像リサイズ（オプション: 最大1000x1000px）
    const imageBuffer = await sharp(buffer)
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

