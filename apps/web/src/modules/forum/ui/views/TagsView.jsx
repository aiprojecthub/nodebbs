import SidebarLayout from '../layouts/SidebarLayout';
import TagsGrid from '../components/TagsGrid';

/**
 * 标签列表页（服务端组件）
 */
export default function TagsView({ tags = [] }) {

  return (
    <SidebarLayout>
      <TagsGrid tags={tags} />
    </SidebarLayout>
  );
}
