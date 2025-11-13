import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    // 認証済みの場合はホーム画面にリダイレクト
    redirect('/recipes');
  } else {
    // 未認証の場合はログインページにリダイレクト
    redirect('/login');
  }
}
