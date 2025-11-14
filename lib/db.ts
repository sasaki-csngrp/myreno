/**
 * データベースアクセス関数（@vercel/postgres使用）
 * Prismaから独立した直接SQLクエリ実装
 * 
 * このファイルは後方互換性のため、lib/db/index.tsへの再エクスポートとして機能します。
 * 新しいコードでは lib/db から直接インポートすることを推奨します。
 */

export * from './db/index';
