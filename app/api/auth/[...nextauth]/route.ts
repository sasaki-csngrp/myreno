import NextAuth, { type NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { verifyPassword } from '@/lib/password';

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

        // メール認証が完了しているかチェック
        if (!user.emailVerified) {
          throw new Error('メールアドレスの確認が完了していません。登録時に送信されたメール内のリンクをクリックしてメールアドレスを確認してください。');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
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
    async jwt({ token, user, account }) {
      // 初回ログイン時（userが存在する場合）
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        // imageはAdapterUser型にのみ存在する可能性があるため、型チェックを行う
        if ('image' in user) {
          token.image = user.image as string | null;
        }
        // emailVerifiedはAdapterUser型にのみ存在する可能性があるため、型チェックを行う
        if ('emailVerified' in user) {
          token.emailVerified = user.emailVerified as Date | null;
        }
      }
      return token;
    },
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
    session: async ({ session, user, token }) => {
      if (session.user) {
        // JWTセッションの場合（Credentials Provider）
        if (token) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string | null;
          session.user.image = token.image as string | null;
          session.user.emailVerified = token.emailVerified as Date | null;
        }
        // Databaseセッションの場合（Google Providerなど）
        else if (user) {
          session.user.id = user.id;
          if ('image' in user) {
            session.user.image = user.image as string | null;
          }
          if ('emailVerified' in user) {
            session.user.emailVerified = user.emailVerified as Date | null;
          }
        }
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt', // Credentials Providerを使用する場合はJWTセッションが必要
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
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

