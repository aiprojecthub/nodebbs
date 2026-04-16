import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import SearchContent from './SearchContent';

export default function SearchView() {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <SearchContent />
    </SidebarLayout>
  );
}
