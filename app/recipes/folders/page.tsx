"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FolderCard from "@/app/components/FolderCard";
import { fetchFoldersWithImages } from "@/lib/actions/recipes";

type Folder = {
  foldername: string;
  images: string[];
};

export default function FoldersPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const foldersData = await fetchFoldersWithImages();
        setFolders(foldersData);
      } catch (error) {
        console.error("フォルダーの読み込みに失敗しました:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFolders();
  }, []);

  const handleFolderClick = (folderName: string) => {
    setIsNavigating(true);
    router.push(`/recipes/folders/${encodeURIComponent(folderName)}`);
  };

  if (isLoading) {
    return (
      <div className="p-4 pt-[100px] md:pt-[130px]">
        <h1 className="text-2xl font-bold mb-4">保存場所一覧</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden shadow-2xl h-full flex flex-col bg-white dark:bg-zinc-900">
              <div className="p-4">
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-1 flex-grow p-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 w-full bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-[100px] md:pt-[130px]">
      <h1 className="text-2xl font-bold mb-4">保存場所一覧</h1>
      {folders.length === 0 ? (
        <p className="text-gray-500">保存場所がありません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {folders.map((folder) => (
            <FolderCard
              key={folder.foldername}
              folderName={folder.foldername}
              images={folder.images}
              isLoading={isNavigating}
              onClick={() => handleFolderClick(folder.foldername)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
