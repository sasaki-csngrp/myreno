"use client";

import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

interface FolderCardProps {
  folderName: string;
  images: string[];
  isLoading?: boolean;
  onClick?: () => void;
}

export default function FolderCard({ folderName, images, isLoading = false, onClick }: FolderCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden shadow-2xl h-full flex flex-col bg-white dark:bg-zinc-900">
        <div className="p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-1 flex-grow p-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link href={`/recipes/folders/${encodeURIComponent(folderName)}`} onClick={handleClick} prefetch={false}>
      <div className="rounded-lg overflow-hidden shadow-2xl h-full flex flex-col">
        <div className="p-4">
          <h2 className="text-xl font-bold">{folderName}</h2>
        </div>
        <div className="grid grid-cols-2 gap-1 flex-grow">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="relative h-24 bg-gray-200 dark:bg-zinc-800 flex items-center justify-center rounded-md"
            >
              {images[index] ? (
                <Image
                  src={images[index]}
                  alt={`${folderName} recipe image ${index + 1}`}
                  fill
                  className="object-cover rounded-md"
                />
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-xs">No Image</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

