import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import NavigationBar from '@/app/components/NavigationBar';
import { SessionProvider } from '@/app/components/SessionProvider';

export default async function RecipesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <NavigationBar />
      <div className="pt-16">
        {children}
      </div>
    </SessionProvider>
  );
}

