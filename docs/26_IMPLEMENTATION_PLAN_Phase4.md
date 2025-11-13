# フェーズ4: レシピ操作モーダルダイアログ（いいね・コメント・フォルダー機能）詳細プラン

## 1. 概要

### 1.1 目的
レシピカードからモーダルダイアログでいいね・コメント・フォルダー機能を実装します。つくおめの実装を踏襲し、Radix UIのAlertDialogとDialogを使用してモーダルダイアログを実装します。

### 1.2 前提条件
- フェーズ0が完了していること（shadcn/uiのセットアップ）
- フェーズ1が完了していること（データベーススキーマ）
- フェーズ1.5が完了していること（ナビゲーションバー）
- フェーズ2が完了していること（レシピ一覧表示機能）
- フェーズ3が完了していること（検索・フィルタリング機能）

### 1.3 実装範囲
- 評価設定モーダルダイアログ（いいね機能）
- コメント入力モーダルダイアログ（コメント機能）
- フォルダー設定モーダルダイアログ（フォルダー機能）
- レシピカードコンポーネントの拡張（モーダルダイアログの統合）
- サーバーアクション（updateRank, updateComment, fetchFolders, addRecipeToFolder, removeRecipeFromFolder）

### 1.4 実装しない機能
- フォルダー一覧ページ（フェーズ5で実装）
- フォルダー内レシピ一覧（フェーズ5で実装）
- フォルダー作成・削除機能（フェーズ5で実装、ただしFolderDialog内で使用するため一部実装）

**注意**: フォルダー作成・削除機能はフェーズ5で実装しますが、FolderDialog内で使用するため、このフェーズで一部実装します。

---

## 2. サーバーアクションの実装

### 2.1 ファイルの更新

`lib/actions/recipes.ts`を更新します。

### 2.2 実装内容

#### 2.2.1 updateRank関数の実装

```typescript
/**
 * レシピの評価（rank）を更新するサーバーアクション
 * @param recipeId レシピID
 * @param rank 評価値（0: いいねなし, 1: 好き, 2: まあまあ, 9: 好きじゃない）
 */
export async function updateRank(recipeId: number, rank: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // 既存のレコードを確認
  const existing = await prisma.renoUserRecipePreference.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (existing) {
    // 既存のレコードを更新
    await prisma.renoUserRecipePreference.update({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
      data: {
        rank,
      },
    });
  } else {
    // 新規レコードを作成
    await prisma.renoUserRecipePreference.create({
      data: {
        userId,
        recipeId,
        rank,
      },
    });
  }
}
```

#### 2.2.2 updateComment関数の実装

```typescript
/**
 * レシピのコメントを更新するサーバーアクション
 * @param recipeId レシピID
 * @param comment コメント（空文字列の場合は削除）
 */
export async function updateComment(recipeId: number, comment: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // 既存のレコードを確認
  const existing = await prisma.renoUserRecipePreference.findUnique({
    where: {
      userId_recipeId: {
        userId,
        recipeId,
      },
    },
  });

  if (existing) {
    // 既存のレコードを更新
    await prisma.renoUserRecipePreference.update({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
      data: {
        comment: comment.trim() || null,
      },
    });
  } else {
    // 新規レコードを作成（コメントのみ）
    await prisma.renoUserRecipePreference.create({
      data: {
        userId,
        recipeId,
        rank: 0,
        comment: comment.trim() || null,
      },
    });
  }
}
```

#### 2.2.3 fetchFolders関数の実装

```typescript
/**
 * フォルダー一覧を取得するサーバーアクション（レシピの登録状態付き）
 * @param recipeId レシピID（このレシピが登録されているフォルダーを判定）
 * @returns フォルダー一覧（isInFolderフラグ付き）
 */
export async function fetchFolders(recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // ユーザーのフォルダー一覧を取得
  const folders = await prisma.renoUserFolder.findMany({
    where: {
      userId,
    },
    orderBy: {
      foldername: "asc",
    },
  });

  // レシピが登録されているフォルダーを判定
  const foldersWithStatus = folders.map((folder) => {
    let isInFolder = false;
    if (folder.idOfRecipes) {
      const ids = folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));
      isInFolder = ids.includes(recipeId);
    }

    return {
      foldername: folder.foldername,
      isInFolder,
    };
  });

  return foldersWithStatus;
}
```

#### 2.2.4 createFolder関数の実装

```typescript
/**
 * フォルダーを作成するサーバーアクション
 * @param folderName フォルダー名
 */
export async function createFolder(folderName: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダー名のバリデーション
  if (!folderName.trim()) {
    throw new Error("フォルダー名を入力してください");
  }

  // 既存のフォルダーを確認
  const existing = await prisma.renoUserFolder.findUnique({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName.trim(),
      },
    },
  });

  if (existing) {
    throw new Error("このフォルダー名は既に存在します");
  }

  // 新規フォルダーを作成
  await prisma.renoUserFolder.create({
    data: {
      userId,
      foldername: folderName.trim(),
      idOfRecipes: "",
    },
  });
}
```

#### 2.2.5 deleteFolder関数の実装

```typescript
/**
 * フォルダーを削除するサーバーアクション
 * @param folderName フォルダー名
 */
export async function deleteFolder(folderName: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを削除
  await prisma.renoUserFolder.delete({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName,
      },
    },
  });
}
```

#### 2.2.6 addRecipeToFolder関数の実装

```typescript
/**
 * レシピをフォルダーに追加するサーバーアクション
 * @param folderName フォルダー名
 * @param recipeId レシピID
 */
export async function addRecipeToFolder(folderName: string, recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを取得
  const folder = await prisma.renoUserFolder.findUnique({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName,
      },
    },
  });

  if (!folder) {
    throw new Error("フォルダーが見つかりません");
  }

  // 既存のレシピIDリストを取得
  const existingIds = folder.idOfRecipes
    ? folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  // 既に登録されている場合は何もしない
  if (existingIds.includes(recipeId)) {
    return;
  }

  // レシピIDを追加
  const newIds = [...existingIds, recipeId];
  const newIdOfRecipes = newIds.join(" ");

  // フォルダーを更新
  await prisma.renoUserFolder.update({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName,
      },
    },
    data: {
      idOfRecipes: newIdOfRecipes,
    },
  });
}
```

#### 2.2.7 removeRecipeFromFolder関数の実装

```typescript
/**
 * レシピをフォルダーから削除するサーバーアクション
 * @param folderName フォルダー名
 * @param recipeId レシピID
 */
export async function removeRecipeFromFolder(folderName: string, recipeId: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }

  const userId = session.user.id;

  // フォルダーを取得
  const folder = await prisma.renoUserFolder.findUnique({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName,
      },
    },
  });

  if (!folder) {
    throw new Error("フォルダーが見つかりません");
  }

  // 既存のレシピIDリストを取得
  const existingIds = folder.idOfRecipes
    ? folder.idOfRecipes
        .split(" ")
        .filter((id) => id.trim() !== "")
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id))
    : [];

  // レシピIDを削除
  const newIds = existingIds.filter((id) => id !== recipeId);
  const newIdOfRecipes = newIds.join(" ");

  // フォルダーを更新
  await prisma.renoUserFolder.update({
    where: {
      userId_foldername: {
        userId,
        foldername: folderName,
      },
    },
    data: {
      idOfRecipes: newIdOfRecipes,
    },
  });
}
```

### 2.3 実装のポイント

1. **認証チェック**: すべてのサーバーアクションで認証チェックを実施
2. **upsert処理**: 既存レコードがあれば更新、なければ作成
3. **フォルダー管理**: `idOfRecipes`をスペース区切りの文字列で管理
4. **エラーハンドリング**: 適切なエラーメッセージを返す

---

## 3. 評価設定モーダルダイアログの実装

### 3.1 ファイルの作成

`app/components/LikeDialog.tsx`を作成します。

### 3.2 実装内容

```typescript
"use client";

import { useState, useEffect } from "react";
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
import { Heart } from "lucide-react";

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
        <div className="flex justify-around p-4">
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
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>実行</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 3.3 実装のポイント

1. **4段階評価**: 0（普通）、1（めっちゃ好き）、2（まあまあ）を実装（9は実装しない）
2. **視覚的フィードバック**: 選択された評価を背景色で表示
3. **ダークモード対応**: ダークモードのスタイルを適用
4. **Radix UI**: AlertDialogコンポーネントを使用

---

## 4. コメント入力モーダルダイアログの実装

### 4.1 ファイルの作成

`app/components/CommentDialog.tsx`を作成します。

### 4.2 実装内容

```typescript
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
          className="min-h-[200px] text-base"
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
```

### 4.3 実装のポイント

1. **テキストエリア**: コメントを入力・編集
2. **初期値の設定**: 既存のコメントがある場合は表示
3. **Radix UI**: Dialogコンポーネントを使用
4. **ダークモード対応**: ダークモードのスタイルを適用

---

## 5. フォルダー設定モーダルダイアログの実装

### 5.1 ファイルの作成

`app/components/FolderDialog.tsx`を作成します。

### 5.2 実装内容

```typescript
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
}

type FolderWithStatus = {
  foldername: string;
  isInFolder: boolean;
};

export default function FolderDialog({
  isOpen,
  onOpenChange,
  recipe,
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
                className="flex-1"
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
```

### 5.3 実装のポイント

1. **フォルダー一覧表示**: チェックボックス（Starアイコン）でレシピの登録状態を表示
2. **フォルダー作成**: 新しいフォルダーを作成
3. **フォルダー削除**: 確認ダイアログを表示してから削除
4. **レシピの追加/削除**: Starアイコンをクリックしてレシピをフォルダーに追加/削除
5. **処理中の状態管理**: 多重クリックを防止
6. **ダークモード対応**: ダークモードのスタイルを適用

---

## 6. レシピカードコンポーネントの拡張

### 6.1 ファイルの更新

`app/components/RecipeCard.tsx`を更新します。

### 6.2 実装内容

レシピカードコンポーネントは既に実装されているため、変更は不要です。ただし、`onLikeClick`、`onCommentClick`、`onFolderClick`のハンドラーを実装する必要があります。

---

## 7. RecipeListWithLoadMoreコンポーネントの更新

### 7.1 ファイルの更新

`app/components/RecipeListWithLoadMore.tsx`を更新します。

### 7.2 実装内容

```typescript
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import RecipeCard from "./RecipeCard";
import LikeDialog from "./LikeDialog";
import CommentDialog from "./CommentDialog";
import FolderDialog from "./FolderDialog";
import { getFilteredRecipes } from "@/lib/actions/recipes";
import { updateRank, updateComment } from "@/lib/actions/recipes";

type Recipe = {
  recipeId: number;
  title: string;
  imageUrl: string | null;
  tsukurepoCount: number;
  rank: number;
  comment: string | null;
  isInFolder: boolean;
};

interface RecipeListWithLoadMoreProps {
  initialRecipes: Recipe[];
  initialHasMore: boolean;
  searchTerm?: string;
  searchMode?: string;
  searchTag?: string;
  folderName?: string;
  searchRank?: string;
}

const ITEMS_PER_PAGE = 12;

export default function RecipeListWithLoadMore({
  initialRecipes,
  initialHasMore,
  searchTerm = "",
  searchMode = "all",
  searchTag = "",
  folderName = "",
  searchRank = "all",
}: RecipeListWithLoadMoreProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [offset, setOffset] = useState<number>(initialRecipes.length);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [loading, setLoading] = useState<boolean>(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // モーダルダイアログの状態管理
  const [likeDialogOpen, setLikeDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // 検索条件が変更されたときにリセット
  useEffect(() => {
    setRecipes(initialRecipes);
    setOffset(initialRecipes.length);
    setHasMore(initialHasMore);
  }, [initialRecipes, initialHasMore]);

  const loadMoreRecipes = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const { recipes: newRecipes, hasMore: newHasMore } =
        await getFilteredRecipes(
          offset,
          ITEMS_PER_PAGE,
          searchTerm,
          searchMode as "all" | "main_dish" | "sub_dish" | "others",
          searchTag,
          folderName,
          searchRank as "all" | "1" | "2"
        );
      setRecipes((prevRecipes) => [...prevRecipes, ...newRecipes]);
      setOffset((prevOffset) => prevOffset + newRecipes.length);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("レシピの読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  }, [
    offset,
    hasMore,
    loading,
    searchTerm,
    searchMode,
    searchTag,
    folderName,
    searchRank,
  ]);

  // Intersection Observer で自動的に「もっと見る」を実行
  useEffect(() => {
    const observerElement = loadMoreRef.current;
    if (!observerElement || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreRecipes();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(observerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadMoreRecipes]);

  const handleLikeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setLikeDialogOpen(true);
  };

  const handleCommentClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCommentDialogOpen(true);
  };

  const handleFolderClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFolderDialogOpen(true);
  };

  const handleLikeSubmit = async (rank: number) => {
    if (!selectedRecipe) return;
    try {
      await updateRank(selectedRecipe.recipeId, rank);
      // レシピの状態を更新
      setRecipes((prevRecipes) =>
        prevRecipes.map((r) =>
          r.recipeId === selectedRecipe.recipeId ? { ...r, rank } : r
        )
      );
    } catch (error) {
      console.error("評価の更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "評価の更新に失敗しました");
    }
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!selectedRecipe) return;
    try {
      await updateComment(selectedRecipe.recipeId, comment);
      // レシピの状態を更新
      setRecipes((prevRecipes) =>
        prevRecipes.map((r) =>
          r.recipeId === selectedRecipe.recipeId
            ? { ...r, comment: comment.trim() || null }
            : r
        )
      );
    } catch (error) {
      console.error("コメントの更新に失敗しました:", error);
      alert(error instanceof Error ? error.message : "コメントの更新に失敗しました");
    }
  };

  return (
    <div>
      {/* グリッドレイアウト */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.recipeId}
            recipe={recipe}
            onLikeClick={() => handleLikeClick(recipe)}
            onCommentClick={() => handleCommentClick(recipe)}
            onFolderClick={() => handleFolderClick(recipe)}
          />
        ))}
      </div>

      {/* 読み込み中表示 */}
      {loading && (
        <div className="flex justify-center mt-8">
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      )}

      {/* Intersection Observer用の監視要素 */}
      {hasMore && <div ref={loadMoreRef} className="h-1 w-full" />}

      {/* モーダルダイアログ */}
      {selectedRecipe && (
        <>
          <LikeDialog
            isOpen={likeDialogOpen}
            currentRank={selectedRecipe.rank}
            onClose={() => setLikeDialogOpen(false)}
            onSubmit={handleLikeSubmit}
          />
          <CommentDialog
            isOpen={commentDialogOpen}
            recipeName={selectedRecipe.title}
            currentComment={selectedRecipe.comment}
            onClose={() => setCommentDialogOpen(false)}
            onSubmit={handleCommentSubmit}
          />
          <FolderDialog
            isOpen={folderDialogOpen}
            onOpenChange={setFolderDialogOpen}
            recipe={{
              recipeId: selectedRecipe.recipeId,
              title: selectedRecipe.title,
              imageUrl: selectedRecipe.imageUrl,
            }}
          />
        </>
      )}
    </div>
  );
}
```

### 7.3 実装のポイント

1. **モーダルダイアログの統合**: LikeDialog、CommentDialog、FolderDialogを統合
2. **状態管理**: 選択されたレシピとモーダルの開閉状態を管理
3. **Optimistic UI**: サーバーアクション実行後にローカル状態を更新
4. **エラーハンドリング**: エラー発生時にアラートを表示

---

## 8. shadcn/uiコンポーネントの確認

### 8.1 必要なコンポーネント

以下のコンポーネントが既に追加されていることを確認してください：
- `alert-dialog`（フェーズ0で追加済み）
- `dialog`（フェーズ0で追加済み）
- `button`（フェーズ0で追加済み）
- `input`（フェーズ0で追加済み）
- `textarea`（フェーズ0で追加済み）

### 8.2 追加が必要な場合

もしコンポーネントが追加されていない場合は、以下を実行してください：

```bash
npx shadcn@latest add alert-dialog
npx shadcn@latest add dialog
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add textarea
```

---

## 9. 動作確認

### 9.1 基本的な動作確認

1. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

2. ブラウザで`http://localhost:3050/recipes`にアクセス

3. 以下の確認を行います：
   - レシピカードのいいねボタンをクリックしてLikeDialogが開く
   - 評価を選択して「実行」をクリックすると評価が更新される
   - レシピカードのコメントボタンをクリックしてCommentDialogが開く
   - コメントを入力して「保存」をクリックするとコメントが保存される
   - レシピカードのフォルダーボタンをクリックしてFolderDialogが開く
   - フォルダーにレシピを追加/削除できる
   - フォルダーを作成・削除できる

### 9.2 評価機能の確認

1. いいねボタンをクリック
2. 評価を選択（めっちゃ好き、まあまあ、普通）
3. 「実行」をクリック
4. レシピカードのハートアイコンの色が更新されることを確認

### 9.3 コメント機能の確認

1. コメントボタンをクリック
2. コメントを入力
3. 「保存」をクリック
4. レシピカードのコメントアイコンが青色になることを確認
5. 再度コメントボタンをクリックして、コメントが表示されることを確認

### 9.4 フォルダー機能の確認

1. フォルダーボタンをクリック
2. 新しいフォルダーを作成
3. Starアイコンをクリックしてレシピをフォルダーに追加
4. レシピカードのStarアイコンが黄色になることを確認
5. 再度フォルダーボタンをクリックして、レシピがフォルダーに登録されていることを確認
6. Starアイコンをクリックしてレシピをフォルダーから削除
7. フォルダーを削除（確認ダイアログが表示されることを確認）

### 9.5 ダークモード確認

1. ブラウザのダークモード設定を有効化
2. 以下の確認を行います：
   - モーダルダイアログの背景色がダークモードに対応している
   - テキストの色が適切に表示されている
   - ボタンの色が適切に表示されている

---

## 10. 完了条件

以下のすべてが完了していることを確認してください：

- [ ] `lib/actions/recipes.ts`に`updateRank`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`updateComment`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`fetchFolders`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`createFolder`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`deleteFolder`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`addRecipeToFolder`関数が実装されている
- [ ] `lib/actions/recipes.ts`に`removeRecipeFromFolder`関数が実装されている
- [ ] `app/components/LikeDialog.tsx`が作成されている
- [ ] `app/components/CommentDialog.tsx`が作成されている
- [ ] `app/components/FolderDialog.tsx`が作成されている
- [ ] `app/components/RecipeListWithLoadMore.tsx`が更新されている
- [ ] レシピカードから評価設定モーダルが開ける
- [ ] 評価設定が正常に動作する（3段階評価：0, 1, 2）
- [ ] レシピカードからコメント入力モーダルが開ける
- [ ] コメント機能が正常に動作する
- [ ] レシピカードからフォルダー設定モーダルが開ける
- [ ] フォルダーにレシピを追加/削除できる
- [ ] フォルダーを作成・削除できる
- [ ] 現在の評価状態がレシピカードに表示される
- [ ] コメント有無がレシピカードに表示される
- [ ] フォルダー登録状態がレシピカードに表示される
- [ ] ダークモードに対応している
- [ ] エラーが発生していない

---

## 11. 次のステップ

フェーズ4が完了したら、**フェーズ5: フォルダー機能（フォルダー一覧ページ、フォルダー内レシピ一覧）**に進みます。

---

## 12. 参考資料

- `docs/01_REQUIREMENTS.md` の5.1.5節（レシピ詳細操作）
- `docs/02_SOLUTION_DESIGN.md` の4.1.2節（ユーザー別データベース）
- `docs/13_IMPLEMENTATION_PLAN.md` のフェーズ4節
- `/root/tukuome3v2/app/components/LikeDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/CommentDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/FolderDialog.tsx`（つくおめの実装）
- `/root/tukuome3v2/app/components/RecipeCard.tsx`（つくおめの実装）
- `/root/tukuome3v2/lib/services.ts`（つくおめの実装）

---

## 13. トラブルシューティング

### 13.1 よくあるエラーと対処法

**エラー: 認証が必要です**
- セッションが正しく取得できているか確認
- `getServerSession`が正しく動作しているか確認

**エラー: 評価が更新されない**
- `updateRank`関数が正しく動作しているか確認
- データベースの`reno_user_recipe_preferences`テーブルにレコードが作成/更新されているか確認

**エラー: コメントが保存されない**
- `updateComment`関数が正しく動作しているか確認
- データベースの`reno_user_recipe_preferences`テーブルにレコードが作成/更新されているか確認

**エラー: フォルダーにレシピを追加できない**
- `addRecipeToFolder`関数が正しく動作しているか確認
- データベースの`reno_user_folders`テーブルの`idOfRecipes`が正しく更新されているか確認

**エラー: モーダルダイアログが開かない**
- shadcn/uiのコンポーネントが正しく追加されているか確認
- `components/ui/alert-dialog.tsx`と`components/ui/dialog.tsx`が存在するか確認

**エラー: レシピカードの状態が更新されない**
- `RecipeListWithLoadMore`コンポーネントの状態更新ロジックが正しいか確認
- Optimistic UIの実装が正しいか確認

---

## 14. 更新履歴

- 2024-XX-XX: 初版作成

