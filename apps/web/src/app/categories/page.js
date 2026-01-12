import CategoriesLayout from './components/CategoriesLayout';

export const metadata = {
  title: '分类',
  description: '浏览所有话题分类，发现感兴趣的内容。',
};

export default function CategoriesPage() {
  return (
    <div className='container mx-auto p-0 sm:py-6 lg:px-4'>
      <CategoriesLayout />
    </div>
  );
}
