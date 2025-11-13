import { redirect } from "next/navigation";

interface FolderRecipesPageProps {
  params: Promise<{
    folderName: string;
  }>;
}

export default async function FolderRecipesPage({
  params,
}: FolderRecipesPageProps) {
  // 新しい設計では1ユーザー1フォルダーのため、folderNameパラメータは不要
  // 保存されたレシピ一覧ページにリダイレクト
  redirect("/recipes/folders");
}

