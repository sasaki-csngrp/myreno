/**
 * S3のURLをProxy経由のURLに変換するヘルパー関数
 * パブリックアクセスがブロックされているS3バケットの画像にアクセスするために使用
 */
export function getImageProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Google認証などで取得した外部URLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // S3のURL形式: https://bucket-name.s3.region.amazonaws.com/key
    // Proxy経由のURL形式: /api/user/image/[key]
    try {
      const urlObj = new URL(url);
      // S3のURLかどうかを判定（s3.region.amazonaws.comを含む）
      if (urlObj.hostname.includes('s3.') && urlObj.hostname.includes('.amazonaws.com')) {
        const pathname = urlObj.pathname;
        if (pathname.startsWith('/')) {
          const key = pathname.substring(1);
          return `/api/user/image/${encodeURIComponent(key)}`;
        }
      }
      // S3以外のURL（Google認証など）はそのまま返す
      return url;
    } catch {
      // URL解析エラーの場合はそのまま返す
      return url;
    }
  }
  
  // 相対パスの場合はそのまま返す
  return url;
}

