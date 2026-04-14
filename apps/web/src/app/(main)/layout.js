import { getTemplate } from '@/templates';

export default function Layout({ children }) {
  const PageLayout = getTemplate('PageLayout');
  return <PageLayout>{children}</PageLayout>;
}
