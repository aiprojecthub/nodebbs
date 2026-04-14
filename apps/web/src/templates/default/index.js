// Views - 页面级 View 组件
export { default as HomeView } from '@/app/(main)/components/HomeView';
export { default as CategoryView } from '@/app/(main)/categories/[id]/components/CategoryView';
export { default as TagView } from '@/app/(main)/tags/[slug]/components/TagView';
export { CategoriesView } from '@/app/(main)/categories/components/CategoriesView';
export { default as TagNotFoundView } from '@/app/(main)/tags/[slug]/components/TagNotFoundView';
export { default as TagsView } from '@/app/(main)/tags/components/TagsView';
export { default as TopicView } from '@/app/(main)/topic/[id]/components/TopicView';
export { default as UserView } from '@/app/(main)/users/[id]/components/UserView';
export { default as RankView } from '@/app/(main)/rank/components/RankView';
export { default as SearchView } from '@/app/(main)/search/components/SearchView';

// Layouts - 布局组件
export { default as PageLayout } from './layouts/PageLayout';
export { default as AppLayout } from './layouts/AppLayout';

// Globals - 全局组件
export { default as Header } from '@/components/layout/Header';
export { default as Footer } from '@/components/layout/Footer';
