'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
    >
      ログアウト
    </button>
  );
}

