// 環境変数を読み込む
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { sql } from '@vercel/postgres';

async function checkAuthTables() {
  try {
    console.log('🔍 認証テーブルの構造を確認中...\n');
    
    // reno_usersテーブルの構造を確認
    const usersResult = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'reno_users'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 reno_usersテーブルの構造:');
    console.log('─'.repeat(60));
    usersResult.rows.forEach((row) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    console.log('─'.repeat(60));
    
    // 他の認証テーブルの存在確認
    const tables = ['reno_accounts', 'reno_sessions', 'reno_verification_tokens'];
    
    for (const tableName of tables) {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        ) as exists
      `;
      
      if (result.rows[0]?.exists) {
        console.log(`\n✅ ${tableName}テーブルは存在します`);
      } else {
        console.log(`\n❌ ${tableName}テーブルは存在しません`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

checkAuthTables();

