"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";

type LikeDialogProps = {
  isOpen: boolean;
  currentRank: number;
  onClose: () => void;
  onSubmit: (rank: number) => void;
};

export default function LikeDialog({
  isOpen,
  currentRank,
  onClose,
  onSubmit,
}: LikeDialogProps) {
  const [selectedRank, setSelectedRank] = useState(currentRank);

  useEffect(() => {
    setSelectedRank(currentRank);
  }, [currentRank]);

  const handleSelectRank = (rank: number) => {
    setSelectedRank(rank);
  };

  const handleSubmit = () => {
    onSubmit(selectedRank);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>レシピの評価を選択してください</AlertDialogTitle>
          <AlertDialogDescription>
            このレシピに対するあなたの「好き」の度合いを選んでください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-around p-4 gap-2">
          <button
            className={`flex flex-col items-center p-2 rounded-md transition-colors ${
              selectedRank === 1
                ? "bg-red-100 dark:bg-red-900/30"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
            onClick={() => handleSelectRank(1)}
          >
            <Heart fill="red" stroke="red" size={32} />
            <span className="text-sm mt-1">めっちゃ好き</span>
          </button>
          <button
            className={`flex flex-col items-center p-2 rounded-md transition-colors ${
              selectedRank === 2
                ? "bg-orange-100 dark:bg-orange-900/30"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
            onClick={() => handleSelectRank(2)}
          >
            <Heart fill="orange" stroke="orange" size={32} />
            <span className="text-sm mt-1">まあまあ</span>
          </button>
          <button
            className={`flex flex-col items-center p-2 rounded-md transition-colors ${
              selectedRank === 0
                ? "bg-gray-100 dark:bg-zinc-800"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
            onClick={() => handleSelectRank(0)}
          >
            <Heart fill="none" stroke="currentColor" size={32} />
            <span className="text-sm mt-1">普通</span>
          </button>
          <button
            className={`flex flex-col items-center p-2 rounded-md transition-colors ${
              selectedRank === 9
                ? "bg-purple-200 dark:bg-purple-900/30"
                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
            }`}
            onClick={() => handleSelectRank(9)}
          >
            <HeartOff fill="#9333ea" stroke="#9333ea" size={32} />
            <span className={`text-sm mt-1 ${selectedRank === 9 ? "text-purple-700 dark:text-purple-400" : ""}`}>好きじゃない</span>
          </button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>キャンセル</AlertDialogCancel>
          <Button 
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            保存
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

