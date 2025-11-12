import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Neonのpoolerを使用している場合、接続URLにpgbouncerパラメータを追加
// これにより、準備済みステートメントのキャッシュ問題を回避
const getDatabaseUrl = () => {
  const url = process.env.POSTGRES_URL || '';
  // poolerを使用している場合、pgbouncer=trueを追加
  if (url.includes('pooler') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}pgbouncer=true`;
  }
  return url;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 開発環境で接続をリセット（スキーマ変更後のキャッシュ問題を回避）
if (process.env.NODE_ENV === 'development') {
  // グレースフルシャットダウン時に接続を切断
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

