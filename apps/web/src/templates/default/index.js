export { default as manifest } from './manifest';

// Views - 页面级 View 组件
export { default as HomeView } from './views/HomeView';
export { default as CategoryView } from './views/CategoryView';
export { default as TagView } from './views/TagView';
export { CategoriesView } from './views/CategoriesView';
export { default as TagNotFoundView } from './views/TagNotFoundView';
export { default as TagsView } from './views/TagsView';
export { default as TopicView } from './views/TopicView';
export { TopicSkeleton } from '@/app/(main)/topic/[id]/components/TopicSkeleton';
export { default as UserView } from './views/UserView';
export { default as RankView } from './views/RankView';
export { default as SearchView } from './views/SearchView';

// Layouts - 布局组件
export { default as PageLayout } from './layouts/PageLayout';
export { default as AppLayout } from './layouts/AppLayout';
export { default as SidebarLayout } from './layouts/SidebarLayout';

// Globals - 全局组件
export { default as Header } from '@/components/layout/Header';
export { default as Footer } from '@/components/layout/Footer';
