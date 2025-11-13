import { Grid3x3, UtensilsCrossed, Salad, MoreHorizontal } from 'lucide-react';

export const searchModes = [
  { mode: 'all', label: 'すべて', icon: Grid3x3 },
  { mode: 'main_dish', label: '主菜', icon: UtensilsCrossed },
  { mode: 'sub_dish', label: '副菜', icon: Salad },
  { mode: 'others', label: 'その他', icon: MoreHorizontal },
];

export const ITEMS_PER_PAGE = 12;

export function calculateNextOffset(currentOffset: number): number {
  return currentOffset + ITEMS_PER_PAGE;
}

