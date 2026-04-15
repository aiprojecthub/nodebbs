import { getTemplate } from '@/templates';
import { LAYOUTS } from '@/templates/constants';

export default function Layout({ children }) {
  const PageLayout = getTemplate(LAYOUTS.PageLayout);
  return <PageLayout>{children}</PageLayout>;
}
