"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
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
    isInFolder: boolean;
  } | null;
  onFolderChange?: () => void; // フォルダー操作後に呼ばれるコールバック
}

export default function FolderDialog({
  isOpen,
  onOpenChange,
  recipe,
  onFolderChange,
}: FolderDialogProps) {
  const [isInFolder, setIsInFolder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (recipe) {
      setIsInFolder(recipe.isInFolder);
    }
  }, [recipe]);

  const handleSubmit = async () => {
    if (!recipe || isProcessing) return;

    setIsProcessing(true);
    try {
      if (isInFolder) {
        await removeRecipeFromFolder(recipe.recipeId);
      } else {
        await addRecipeToFolder(recipe.recipeId);
      }
      // 親コンポーネントに通知してレシピカードの状態を更新
      if (onFolderChange) {
        onFolderChange();
      }
      onOpenChange(false);
    } catch (error) {
      console.error("フォルダー操作に失敗しました:", error);
      alert(error instanceof Error ? error.message : "フォルダー操作に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>レシピを保存</DialogTitle>
        </DialogHeader>
        {recipe && (
          <div>
            <h3 className="font-bold mb-2">{recipe.title}</h3>
            <div className="relative w-full h-64 bg-gray-200 dark:bg-zinc-800 rounded-lg overflow-hidden mb-4">
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {isInFolder
                ? "このレシピは既に保存されています。保存を解除しますか？"
                : "このレシピを保存しますか？"}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            キャンセル
          </Button>
          {isInFolder ? (
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400"
            >
              {isProcessing ? "処理中..." : "保存を解除"}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isProcessing ? "処理中..." : "保存"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
