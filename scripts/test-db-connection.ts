// 環境変数を読み込む（.env.localを優先）
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localファイルを読み込む
config({ path: resolve(process.cwd(), '.env.local') });
// .envファイルも読み込む（.env.localがない場合のフォールバック）
config({ path: resolve(process.cwd(), '.env') });

import { sql } from '@vercel/postgres';

/**
 * Vercel Postgresへの接続をテストし、reno_recipesテーブルからデータを取得する
 */
async function testDatabaseConnection() {
  try {
    console.log('🔌 Vercel Postgresへの接続をテストしています...');
    
    // reno_recipesテーブルからデータを取得（最大10件）
    const result = await sql`
      SELECT 
        recipe_id,
        title,
        image_url,
        tsukurepo_count,
        is_main_dish,
        is_sub_dish,
        tag
      FROM reno_recipes
      ORDER BY recipe_id
      LIMIT 10
    `;
    
    console.log('✅ データベース接続成功！');
    console.log(`📊 取得したレコード数: ${result.rows.length}`);
    
    if (result.rows.length === 0) {
      console.log('⚠️  reno_recipesテーブルにデータがありません。');
    } else {
      console.log('\n📋 取得したデータ:');
      console.log('─'.repeat(80));
      result.rows.forEach((row, index) => {
        console.log(`\n[${index + 1}]`);
        console.log(`  Recipe ID: ${row.recipe_id}`);
        console.log(`  Title: ${row.title || '(タイトルなし)'}`);
        console.log(`  Image URL: ${row.image_url || '(画像なし)'}`);
        console.log(`  Tsukurepo Count: ${row.tsukurepo_count || 0}`);
        console.log(`  Is Main Dish: ${row.is_main_dish ? 'Yes' : 'No'}`);
        console.log(`  Is Sub Dish: ${row.is_sub_dish ? 'Yes' : 'No'}`);
        console.log(`  Tags: ${row.tag || '(タグなし)'}`);
      });
      console.log('\n' + '─'.repeat(80));
    }
    
    // テーブルの総レコード数も取得
    const countResult = await sql`
      SELECT COUNT(*) as total_count
      FROM reno_recipes
    `;
    
    const totalCount = countResult.rows[0]?.total_count || 0;
    console.log(`\n📈 テーブル全体のレコード数: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ データベース接続エラー:');
    if (error instanceof Error) {
      console.error(`   エラーメッセージ: ${error.message}`);
      console.error(`   エラースタック: ${error.stack}`);
    } else {
      console.error('   不明なエラー:', error);
    }
    
    console.error('\n💡 確認事項:');
    console.error('   1. 環境変数 POSTGRES_URL が設定されているか確認してください');
    console.error('   2. データベースが作成されているか確認してください');
    console.error('   3. reno_recipesテーブルが作成されているか確認してください');
    
    process.exit(1);
  }
}

// スクリプトを実行
testDatabaseConnection();

