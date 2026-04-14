import NotFoundView from '@/components/common/NotFoundView';
import { Tag } from 'lucide-react';

export default function TagNotFoundView() {
  return (
    <NotFoundView
      icon={<Tag className='h-10 w-10 text-muted-foreground/50 stroke-[1.5]' />}
      title='标签不存在'
      description='该标签可能已被删除或从未存在。'
    />
  );
}
