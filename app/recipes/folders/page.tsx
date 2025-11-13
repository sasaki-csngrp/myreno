import { fetchFoldersWithImages } from "@/lib/actions/recipes";
import FolderCard from "@/app/components/FolderCard";

export default async function FoldersPage() {
  const folders = await fetchFoldersWithImages();

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
            />
          ))}
        </div>
      )}
    </div>
  );
}

