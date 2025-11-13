import { getTagsByLevel } from "@/lib/actions/recipes";
import TagsList from "@/app/components/TagsList";

interface TagsPageProps {
  searchParams: Promise<{
    tag?: string | string[] | null;
  }>;
}

export default async function TagsPage({ searchParams }: TagsPageProps) {
  const resolvedSearchParams = await searchParams;
  
  // URLパラメータからタグ名を取得
  const tagParam = Array.isArray(resolvedSearchParams?.tag)
    ? resolvedSearchParams.tag[0]
    : resolvedSearchParams?.tag || null;

  let initialTags;
  let initialPath: string[] = [];

  if (tagParam) {
    // タグ名が指定されている場合、そのタグを0階層目から探す
    // まず0階層目のタグを取得
    const level0Tags = await getTagsByLevel(0, "");
    const selectedTag = level0Tags.find(
      (tag) => tag.name === tagParam || tag.dispname === tagParam
    );

    if (selectedTag) {
      // タグが見つかった場合、そのタグをパスに追加して1階層目を表示
      initialPath = [selectedTag.name];
      initialTags = await getTagsByLevel(1, selectedTag.name);
    } else {
      // タグが見つからない場合は0階層目を表示
      initialTags = level0Tags;
    }
  } else {
    // タグ名が指定されていない場合は0階層目を表示
    initialTags = await getTagsByLevel(0, "");
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">タグで探す</h1>
      <TagsList initialTags={initialTags} initialPath={initialPath} />
    </div>
  );
}

