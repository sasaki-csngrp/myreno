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

