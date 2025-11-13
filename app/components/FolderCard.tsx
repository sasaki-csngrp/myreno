"use client";

import Link from "next/link";
import Image from "next/image";

interface FolderCardProps {
  folderName: string;
  images: string[];
}

export default function FolderCard({ folderName, images }: FolderCardProps) {
  return (
    <Link href={`/recipes/folders/${encodeURIComponent(folderName)}`}>
      <div className="rounded-lg overflow-hidden shadow-2xl h-full flex flex-col">
        <div className="p-4">
          <h2 className="text-xl font-bold">{folderName}</h2>
        </div>
        <div className="grid grid-cols-2 gap-1 flex-grow">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="relative h-24 bg-gray-200 flex items-center justify-center rounded-md"
            >
              {images[index] ? (
                <Image
                  src={images[index]}
                  alt={`${folderName} recipe image ${index + 1}`}
                  fill
                  className="object-cover rounded-md"
                />
              ) : (
                <span className="text-gray-500 text-xs">No Image</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

