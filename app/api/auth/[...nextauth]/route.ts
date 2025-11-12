import NextAuth, { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { sendEmail } from '@/lib/sendgrid';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // 同じメールアドレスのアカウントを自動的にリンクする
  allowDangerousEmailAccountLinking: true,
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM!,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log('Sending verification email:', { identifier, url });
        try {
          // callbackUrlを明示的に追加（デフォルトで/recipesにリダイレクト）
          const callbackUrl = '/recipes';
          const urlWithCallback = url.includes('callbackUrl=')
            ? url
            : `${url}${url.includes('?') ? '&' : '?'}callbackUrl=${encodeURIComponent(callbackUrl)}`;
          
          await sendEmail({
            to: identifier,
            subject: 'レノちゃん - ログインリンク',
            html: `
              <h1>ログインリンク</h1>
              <p>以下のリンクをクリックしてログインしてください：</p>
              <p><a href="${urlWithCallback}">${urlWithCallback}</a></p>
              <p>このリンクは24時間有効です。</p>
              <p>このメールに心当たりがない場合は、無視してください。</p>
            `,
          });
          console.log('Email sent successfully to:', identifier);
        } catch (error) {
          console.error('Failed to send verification email:', error);
          throw error;
        }
      },
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
    signIn: async ({ user, account, profile, email }) => {
      console.log('signIn callback:', { 
        user: { id: user.id, email: user.email, name: user.name },
        account: account ? { provider: account.provider, type: account.type } : null,
        profile: profile ? { email: profile.email, name: profile.name } : null,
        email
      });
      
      // Google認証の場合、既存のメール認証アカウントとリンクする
      if (account?.provider === 'google' && user.email && account.providerAccountId) {
        try {
          // 既存のユーザーをメールアドレスで検索
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: true },
          });
          
          // 既存のユーザーが存在し、Googleアカウントがまだリンクされていない場合
          if (existingUser && !existingUser.accounts.some(acc => acc.provider === 'google')) {
            console.log('Linking Google account to existing user:', existingUser.id);
            
            // Googleアカウントを既存のユーザーにリンク
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                refresh_token: account.refresh_token,
              },
            });
            
            // ユーザー情報を更新（Google IDと画像を設定）
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                googleId: account.providerAccountId,
                image: user.image || existingUser.image,
                name: user.name || existingUser.name,
              },
            });
            
            console.log('Google account linked successfully');
            // 既存のユーザーIDを使用するようにuserオブジェクトを更新
            user.id = existingUser.id;
          }
        } catch (error) {
          console.error('Error in signIn callback:', error);
          // エラーが発生しても続行（NextAuth.jsが処理する）
        }
      }
      
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
      console.log('redirect callback:', { url, baseUrl });
      
      // /api/auth/signinにリダイレクトしようとしている場合は、/recipesにリダイレクト
      if (url.includes('/api/auth/signin')) {
        return `${baseUrl}/recipes`;
      }
      
      // Google認証のコールバック後のリダイレクト処理
      // callbackUrlパラメータがある場合はそれを使用
      try {
        const urlObj = new URL(url);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        if (callbackUrl) {
          // callbackUrlが相対パスの場合
          if (callbackUrl.startsWith('/')) {
            return `${baseUrl}${callbackUrl}`;
          }
          // callbackUrlが絶対URLの場合、baseUrlと同じオリジンか確認
          try {
            const callbackUrlObj = new URL(callbackUrl);
            if (callbackUrlObj.origin === baseUrl) {
              return callbackUrl;
            }
          } catch {
            // callbackUrlの解析に失敗した場合は/recipesにリダイレクト
            return `${baseUrl}/recipes`;
          }
        }
        
        // 外部URLの場合はbaseUrlにリダイレクト
        if (urlObj.origin !== baseUrl) {
          return `${baseUrl}/recipes`;
        }
      } catch {
        // URL解析エラーの場合
        // urlが相対パスの場合、baseUrlと結合
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        // それ以外の場合は/recipesにリダイレクト
        return `${baseUrl}/recipes`;
      }
      
      // urlが相対パスの場合、baseUrlと結合
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      return url;
    },
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30日
    updateAge: 24 * 60 * 60, // 24時間
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined, // localhostではdomainを設定しない
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  trustHost: true, // localhostでの開発環境で必要
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

