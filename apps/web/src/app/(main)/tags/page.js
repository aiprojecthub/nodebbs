import { getTagsData } from '@/lib/server/topics';
import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

export const metadata = {
  title: '标签广场',
  description: '浏览社区中的所有话题标签',
};

export default async function TagsPage() {
  const tags = await getTagsData({ limit: 500 });
  const TagsView = getTemplate(VIEWS.TagsView);

  return (
    <div className='py-3 sm:py-6 lg:px-4'>
      <TagsView tags={tags} />
    </div>
  );
}
