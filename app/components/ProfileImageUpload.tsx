'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { getImageProxyUrl } from '@/lib/image-utils';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate?: (imageUrl: string | null) => void;
}

export default function ProfileImageUpload({
  currentImageUrl,
  onImageUpdate,
}: ProfileImageUploadProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // currentImageUrlが変更されたときにpreviewを更新
  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルのみアップロード可能です');
      return;
    }

    // ファイルサイズの検証（5MB以下）
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズは5MB以下である必要があります');
      return;
    }

    // プレビューを表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // アップロード
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/user/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'アップロードに失敗しました');
      }

      const data = await response.json();
      
      // プレビューをS3のURLに更新
      setPreview(data.imageUrl);
      
      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          image: data.imageUrl,
        },
      });

      // サーバーコンポーネントを再レンダリングしてナビゲーションバーを更新
      router.refresh();

      // 親コンポーネントに通知
      if (onImageUpdate) {
        onImageUpdate(data.imageUrl);
      }
    } catch (error) {
      console.error('アップロードエラー:', error);
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました');
      // プレビューをリセット
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
      // ファイル入力をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('プロフィール画像を削除しますか？')) {
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/user/delete-image', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          image: null,
        },
      });

      // プレビューをリセット
      setPreview(null);

      // サーバーコンポーネントを再レンダリングしてナビゲーションバーを更新
      router.refresh();

      // 親コンポーネントに通知
      if (onImageUpdate) {
        onImageUpdate(null);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  // プレビュー表示用のURLを取得
  // DataURL（data:image/...）の場合はそのまま使用、S3のURLの場合はProxy経由のURLに変換
  const getDisplayUrl = (): string | null => {
    if (!preview) return null;
    // DataURLの場合はそのまま返す
    if (preview.startsWith('data:')) {
      return preview;
    }
    // S3のURLの場合はProxy経由のURLに変換
    return getImageProxyUrl(preview);
  };

  const displayImageUrl = getDisplayUrl();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 画像プレビュー */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
          {displayImageUrl ? (
            <Image
              src={displayImageUrl}
              alt="プロフィール画像"
              width={128}
              height={128}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <User className="w-16 h-16 text-gray-500 dark:text-gray-400" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <label
          htmlFor="image-upload"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload className="w-4 h-4" />
          {preview ? '画像を変更' : '画像をアップロード'}
        </label>
        <input
          id="image-upload"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        {preview && (
          <button
            onClick={handleDelete}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-4 h-4" />
            削除
          </button>
        )}
      </div>
    </div>
  );
}

