import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * メールベリファイトークンを生成する
 * @param email メールアドレス
 * @returns 生成されたトークン
 */
export async function generateVerificationToken(email: string): Promise<string> {
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

