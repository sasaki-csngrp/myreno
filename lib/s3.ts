import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// S3クライアントのシングルトンインスタンス
let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

// 画像アップロード
export async function uploadImageToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // S3のURLを返す（パブリックアクセスがブロックされているため、proxy経由でアクセス）
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${key}`;
}

// 画像取得（proxy経由で使用）
export async function getImageFromS3(key: string): Promise<Buffer> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('画像が見つかりません');
  }

  // BodyをBufferに変換
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// 画像削除
export async function deleteImageFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const bucketName = process.env.AWS_S3_BUCKET_NAME!;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

