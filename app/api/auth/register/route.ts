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

    // パスワードの最小長をチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
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

