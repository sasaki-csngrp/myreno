"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Star } from "lucide-react";
import Image from "next/image";
import {
  fetchFolders,
  createFolder,
  deleteFolder,
  addRecipeToFolder,
  removeRecipeFromFolder,
} from "@/lib/actions/recipes";

interface FolderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipe: {
    recipeId: number;
    title: string;
    imageUrl: string | null;
  } | null;
  onFolderChange?: () => void; // フォルダー操作後に呼ばれるコールバック
}

type FolderWithStatus = {
  foldername: string;
  isInFolder: boolean;
};

export default function FolderDialog({
  isOpen,
  onOpenChange,
  recipe,
  onFolderChange,
}: FolderDialogProps) {
  const [folders, setFolders] = useState<FolderWithStatus[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadFolders = useCallback(async () => {
    if (!recipe) return;
    try {
      const fetchedFolders = await fetchFolders(recipe.recipeId);
      setFolders(fetchedFolders);
    } catch (error) {
      console.error("フォルダーの読み込みに失敗しました:", error);
    }
  }, [recipe]);

  useEffect(() => {
    if (isOpen && recipe) {
      loadFolders();
    }
  }, [isOpen, recipe, loadFolders]);

  const handleAddFolder = async () => {
    if (newFolderName.trim() === "") return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      await loadFolders();
    } catch (error) {
      console.error("フォルダーの作成に失敗しました:", error);
      alert(error instanceof Error ? error.message : "フォルダーの作成に失敗しました");
    }
  };

  const handleDeleteFolderClick = (folderName: string) => {
    setFolderToDelete(folderName);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (folderToDelete) {
      try {
        await deleteFolder(folderToDelete);
        await loadFolders();
        setFolderToDelete(null);
      } catch (error) {
        console.error("フォルダーの削除に失敗しました:", error);
        alert(error instanceof Error ? error.message : "フォルダーの削除に失敗しました");
      }
    }
    setShowConfirmDialog(false);
  };

  const handleCancelDelete = () => {
    setFolderToDelete(null);
    setShowConfirmDialog(false);
  };

  const handleToggleRecipeInFolder = async (
    folderName: string,
    isInFolder: boolean
  ) => {
    if (!recipe || isProcessing) return;

    setIsProcessing(true);
    try {
      if (isInFolder) {
        await removeRecipeFromFolder(folderName, recipe.recipeId);
      } else {
        await addRecipeToFolder(folderName, recipe.recipeId);
      }
      await loadFolders();
      // 親コンポーネントに通知してレシピカードの状態を更新
      if (onFolderChange) {
        onFolderChange();
      }
    } catch (error) {
      console.error("フォルダー操作に失敗しました:", error);
      alert(error instanceof Error ? error.message : "フォルダー操作に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>フォルダーに追加</DialogTitle>
          </DialogHeader>
          {recipe && (
            <div>
              <h3 className="font-bold mb-2">{recipe.title}</h3>
              <div className="relative w-full h-64 bg-gray-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                {recipe.imageUrl ? (
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 dark:text-zinc-500">
                    <span className="text-sm">画像なし</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="py-4">
            <h4 className="font-bold mb-2">フォルダー一覧</h4>
            <ul
              className={
                isProcessing
                  ? "opacity-50 pointer-events-none"
                  : ""
              }
            >
              {folders.length === 0 ? (
                <li className="text-gray-500 dark:text-gray-400 py-2">
                  フォルダーがありません
                </li>
              ) : (
                folders.map((folder) => (
                  <li
                    key={folder.foldername}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-zinc-700"
                  >
                    <span className="flex-1">{folder.foldername}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleRecipeInFolder(
                            folder.foldername,
                            folder.isInFolder
                          )
                        }
                        className={`p-2 rounded-md transition-colors ${
                          isProcessing
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                        }`}
                        disabled={isProcessing}
                        aria-label={
                          folder.isInFolder
                            ? "フォルダーから削除"
                            : "フォルダーに追加"
                        }
                      >
                        <Star
                          fill={folder.isInFolder ? "yellow" : "none"}
                          stroke={folder.isInFolder ? "black" : "currentColor"}
                          className="w-5 h-5 dark:stroke-zinc-300"
                        />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteFolderClick(folder.foldername)
                        }
                        className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        aria-label="フォルダーを削除"
                      >
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="py-4">
            <h4 className="font-bold mb-2">新しいフォルダーを追加</h4>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="フォルダー名"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddFolder();
                  }
                }}
                className="flex-1 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
              />
              <Button onClick={handleAddFolder}>追加</Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フォルダーを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。フォルダー内のレシピは削除されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

