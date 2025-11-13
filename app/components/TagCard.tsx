"use client";

import Image from "next/image";

export type TagData = {
  tagId: number;
  dispname: string;
  name: string;
  imageUri: string | null;
  hasImageUri: boolean;
  hasChildren: string; // "▼" または "X 件" 形式
};

interface TagCardProps {
  tag: TagData;
  onClick: (tag: TagData) => void;
}

export default function TagCard({ tag, onClick }: TagCardProps) {
  const hasImage = tag.hasImageUri;

  return (
    <div
      className="relative flex items-center justify-center w-full aspect-square rounded-lg overflow-hidden shadow-lg cursor-pointer bg-white dark:bg-zinc-800 hover:shadow-xl transition-shadow"
      onClick={() => onClick(tag)}
    >
      {/* レイヤー1: 背景画像 */}
      {hasImage && tag.imageUri && (
        <Image
          src={tag.imageUri}
          alt={tag.dispname}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover"
        />
      )}

      {/* レイヤー2: 半透明オーバーレイ (画像がある時のみ) */}
      {hasImage && <div className="absolute inset-0 bg-black/30"></div>}

      {/* レイヤー3: テキストコンテンツ (常に最前面) */}
      <div className="relative z-10 text-center px-2">
        <div
          className={`text-2xl font-bold ${
            hasImage ? "text-white" : "text-black dark:text-white"
          }`}
        >
          {tag.dispname}
        </div>
      </div>

      {/* 右下の件数表示 (常に最前面) */}
      {tag.hasChildren && (
        <div className="absolute z-10 bottom-2 right-2 bg-gray-800/75 text-white text-sm px-2 py-1 rounded">
          {tag.hasChildren}
        </div>
      )}
    </div>
  );
}

