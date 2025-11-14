/**
 * クエリビルダーヘルパー関数
 * レシピ検索クエリのWHERE句を生成するためのユーティリティ
 */

import type { SearchMode, RankFilter } from '@/lib/types/recipe';

/**
 * 分類フィルタのWHERE句を生成
 * @param mode 検索モード
 * @returns WHERE句の文字列
 */
export function getModeWhereClause(mode: SearchMode): string {
  switch (mode) {
    case 'main_dish':
      return 'AND r.is_main_dish = true';
    case 'sub_dish':
      return 'AND r.is_sub_dish = true';
    case 'others':
      return 'AND (r.is_main_dish = false AND r.is_sub_dish = false)';
    default:
      return '';
  }
}

/**
 * いいねフィルタのWHERE句を生成
 * @param rank いいねフィルタ
 * @returns WHERE句の文字列
 */
export function getRankWhereClause(rank: RankFilter): string {
  switch (rank) {
    case '1':
      return 'AND COALESCE(urp.rank, 0) = 1';
    case '2':
      return 'AND COALESCE(urp.rank, 0) = 2';
    case 'all':
    default:
      return '';
  }
}

