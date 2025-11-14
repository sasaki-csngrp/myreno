"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import TagCard, { TagData } from "./TagCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getTagsByLevel } from "@/lib/actions/recipes";

type TagsListProps = {
  initialTags: TagData[];
  initialPath?: string[]; // 初期パス（URLパラメータから取得）
};

export default function TagsList({ initialTags, initialPath = [] }: TagsListProps) {
  const router = useRouter();
  const [tags, setTags] = useState<TagData[]>(initialTags);
  const [path, setPath] = useState<string[]>(initialPath);
  const [pathTags, setPathTags] = useState<TagData[]>([]); // パンくずリスト用のタグ情報
  const [isLoading, setIsLoading] = useState(false);

  // 初期パスが設定されている場合、pathTagsを初期化
  useEffect(() => {
    const initializePathTags = async () => {
      if (initialPath.length > 0 && pathTags.length === 0) {
        const tags: TagData[] = [];
        // 各階層のタグ情報を取得
        for (let i = 0; i < initialPath.length; i++) {
          const level = i;
          const parentTagName = i > 0 ? initialPath[i - 1] : "";
          const levelTags = await getTagsByLevel(level, parentTagName);
          const tag = levelTags.find((t) => t.name === initialPath[i]);
          if (tag) {
            tags.push(tag);
          }
        }
        setPathTags(tags);
      }
    };
    initializePathTags();
  }, []); // 初回のみ実行

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      try {
        if (path.length > 0) {
          // パスがある場合は、そのパスに基づいてタグを取得
          const currentLevel = path.length;
          const currentValue = path[path.length - 1];
          const newTags = await getTagsByLevel(currentLevel, currentValue);
          setTags(newTags);
        } else {
          // パスが空の場合は、初期タグ（レベル0）を取得
          const newTags = await getTagsByLevel(0, "");
          setTags(newTags);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, [path]);

  const handleTagClick = (tag: TagData) => {
    if (tag.hasChildren === "▼") {
      // 子タグがある場合は階層を進む
      setPath((prevPath) => [...prevPath, tag.name]);
      setPathTags((prevTags) => [...prevTags, tag]);
    } else {
      // 子タグがない場合はレシピ検索ページに遷移
      router.push(`/recipes/list?tag=${encodeURIComponent(tag.name)}`);
    }
  };

  const handleGoBack = () => {
    setPath((prevPath) => prevPath.slice(0, -1));
    setPathTags((prevTags) => prevTags.slice(0, -1));
  };

  const handleBreadcrumbClick = (index: number) => {
    // クリックした階層まで戻る
    setPath((prevPath) => prevPath.slice(0, index + 1));
    setPathTags((prevTags) => prevTags.slice(0, index + 1));
  };

  // タグ検索画面で「素材別」を「食材」に置き換える（つくおめを踏襲）
  const getDisplayName = (dispname: string) => {
    return dispname === "素材別" ? "食材" : dispname;
  };

  return (
    <div>
      {/* パンくずリスト */}
      <div className="flex items-center gap-3 mb-4 p-3 text-lg text-gray-600 dark:text-gray-400">
        {path.length > 0 ? (
          <>
            <button
              onClick={() => {
                router.push("/recipes");
              }}
              className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Home size={20} />
              <span>ホーム</span>
            </button>
            {pathTags.map((tag, index) => (
              <div key={index} className="flex items-center gap-3">
                <ChevronRight size={20} className="text-gray-400" />
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  {getDisplayName(tag.dispname)}
                </button>
              </div>
            ))}
          </>
        ) : (
          <button
            onClick={() => {
              router.push("/recipes");
            }}
            className="flex items-center gap-2 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Home size={20} />
            <span>ホーム</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-2">
      {isLoading ? (
        [...Array(12)].map((_, i) => (
          <Skeleton key={i} className="w-full aspect-square rounded-lg" />
        ))
      ) : (
        <>
          {tags
            .filter((tag) => {
              // 子タグがある場合は表示
              if (tag.hasChildren === "▼") {
                return true;
              }
              // レシピ件数を抽出（"X 件"形式から数値を取得）
              const match = tag.hasChildren.match(/^(\d+)\s*件$/);
              if (match) {
                const recipeCount = parseInt(match[1], 10);
                return recipeCount > 0;
              }
              return false;
            })
            .map((tag) => {
              // 表示用に「素材別」を「食材」に置き換えたタグを作成
              const displayTag = {
                ...tag,
                dispname: getDisplayName(tag.dispname),
              };
              return (
                <TagCard
                  key={tag.tagId}
                  tag={displayTag}
                  onClick={handleTagClick}
                />
              );
            })}

          {path.length > 0 && (
            <TagCard
              key="back-button"
              tag={{
                tagId: -1, // ユニークな固定値
                dispname: "↩️ 前に戻る",
                name: "back",
                imageUri: null,
                hasImageUri: false,
                hasChildren: "",
              }}
              onClick={() => handleGoBack()}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}

