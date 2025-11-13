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
import { Textarea } from "@/components/ui/textarea";

interface CommentDialogProps {
  isOpen: boolean;
  recipeName: string;
  currentComment: string | null;
  onClose: () => void;
  onSubmit: (comment: string) => void;
}

export default function CommentDialog({
  isOpen,
  onClose,
  recipeName,
  currentComment,
  onSubmit,
}: CommentDialogProps) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    setComment(currentComment || "");
  }, [currentComment, isOpen]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleSubmit = () => {
    onSubmit(comment);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{recipeName}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={comment}
          onChange={handleCommentChange}
          placeholder="コメントを入力してください"
          className="min-h-[200px] text-base focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

