import { request } from '@/lib/server/api';
import TagsUI from './components/TagsUI';

export const metadata = {
  title: '标签广场',
  description: '浏览社区中的所有话题标签',
};

async function getTags() {
  try {
    const data = await request('/tags?limit=500');
    return data.items || [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

export default async function TagsPage() {
  const tags = await getTags();

  return (
    <div className='container mx-auto px-4 py-6'>
      <TagsUI tags={tags} />
    </div>
  );
}
