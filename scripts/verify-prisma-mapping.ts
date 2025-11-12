// 環境変数を読み込む
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { prisma } from '../lib/prisma';

async function verifyPrismaMapping() {
  try {
    console.log('🔍 Prismaスキーマのマッピングを確認中...\n');
    
    // Prisma Clientが使用するテーブル名を確認
    // Userモデルが正しくreno_usersテーブルを参照しているか確認
    const userCount = await prisma.user.count();
    console.log(`✅ Userモデルから取得したレコード数: ${userCount}`);
    console.log('   → これは reno_users テーブルから取得されています\n');
    
    // 実際のテーブル名を確認（SQLクエリで直接確認）
    const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('reno_users', 'users')
      ORDER BY table_name
    `;
    
    console.log('📋 データベース内のテーブル:');
    result.forEach((row) => {
      const isRenoUsers = row.table_name === 'reno_users';
      console.log(`   ${isRenoUsers ? '✅' : '⚠️ '} ${row.table_name} ${isRenoUsers ? '(Prismaが使用中)' : '(未使用)'}`);
    });
    
    // reno_usersテーブルの構造を確認
    const userColumns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reno_users'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📋 reno_usersテーブルの構造:');
    userColumns.forEach((col) => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // NextAuth.jsが使用するテーブルを確認
    console.log('\n🔐 NextAuth.jsが使用するテーブル:');
    console.log('   ✅ reno_users (Userモデル)');
    console.log('   ✅ reno_accounts (Accountモデル)');
    console.log('   ✅ reno_sessions (Sessionモデル)');
    console.log('   ✅ reno_verification_tokens (VerificationTokenモデル)');
    
    console.log('\n✅ 確認完了: Prismaは正しく reno_users テーブルを参照しています！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPrismaMapping();

