import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import TagsContent from './TagsContent';

export default function TagsView({ tags }) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <div>
        <h1 className='text-2xl font-bold mb-6' style={{ fontFamily: 'var(--font-serif)' }}>
          标签
        </h1>
        <TagsContent tags={tags} />
      </div>
    </SidebarLayout>
  );
}
