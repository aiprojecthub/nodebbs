import { getCategoriesData } from '@/lib/server/topics';
import { CategoriesUI } from './components/CategoriesUI';

export const metadata = {
  title: '分类',
  description: '浏览所有话题分类，发现感兴趣的内容。',
};

/**
 * 将扁平分类列表组装为树形结构
 */
function buildCategoryTree(data) {
  const categoryMap = new Map();
  const rootCategories = [];

  data.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, subcategories: [] });
  });

  data.forEach(cat => {
    const category = categoryMap.get(cat.id);
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.subcategories.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  const sortByName = (a, b) => a.name.localeCompare(b.name);
  const sortCategories = (cats) => {
    cats.sort(sortByName);
    cats.forEach(cat => {
      if (cat.subcategories.length > 0) {
        sortCategories(cat.subcategories);
      }
    });
  };
  sortCategories(rootCategories);

  const calculateTotalStats = (category) => {
    let total = category.topicCount || 0;
    if (category.subcategories.length > 0) {
      category.subcategories.forEach(sub => {
        total += calculateTotalStats(sub);
      });
    }
    category.totalTopics = total;
    return total;
  };
  rootCategories.forEach(calculateTotalStats);

  return rootCategories;
}

export default async function CategoriesPage() {
  const data = await getCategoriesData();
  const categories = buildCategoryTree(data);

  return (
    <div className='py-3 sm:py-6 lg:px-4'>
      <CategoriesUI categories={categories} />
    </div>
  );
}
