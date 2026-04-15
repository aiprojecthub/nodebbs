import { getCategoriesTree } from '@/lib/server/topics';
import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

export const metadata = {
  title: '分类',
  description: '浏览所有话题分类，发现感兴趣的内容。',
};

export default async function CategoriesPage() {
  const categories = await getCategoriesTree();
  const CategoriesView = getTemplate(VIEWS.CategoriesView);

  return (
    <div className='py-3 sm:py-6 lg:px-4'>
      <CategoriesView categories={categories} />
    </div>
  );
}
