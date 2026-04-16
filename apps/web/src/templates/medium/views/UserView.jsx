import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';
import UserViewContent from './UserViewContent';

export default function UserView(props) {
  const SidebarLayout = getTemplate(LAYOUTS.SidebarLayout);

  return (
    <SidebarLayout>
      <UserViewContent {...props} />
    </SidebarLayout>
  );
}
