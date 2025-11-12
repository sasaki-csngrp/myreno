import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 認証が必要なページの処理
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // トークンが存在する場合は認証済み
        // トークンが存在しない場合でも、/recipesページではサーバーコンポーネントでセッションをチェックするため、
        // ミドルウェアでは常に許可する（サーバーコンポーネントでリダイレクト処理を行う）
        return true;
      },
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

