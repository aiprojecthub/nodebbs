import { getTemplate } from '@/templates';
import { VIEWS } from '@/templates/constants';

export default function LoadingPage() {
  const TopicSkeleton = getTemplate(VIEWS.TopicSkeleton);
  return <TopicSkeleton />;
}
