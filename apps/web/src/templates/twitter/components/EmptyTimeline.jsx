import Link from '@/components/common/Link';
import { BookOpen, Plus } from 'lucide-react';

export default function EmptyTimeline() {
  return (
    <div className='text-center py-20'>
      <BookOpen className='h-10 w-10 text-muted-foreground/40 mx-auto mb-4' />
      <div className='text-lg font-bold mb-1'>暂无话题</div>
      <p className='text-sm text-muted-foreground mb-4'>还没有人发布话题</p>
      <Link href='/create' className='text-primary text-sm font-bold hover:underline'>
        发布第一个话题
      </Link>
    </div>
  );
}
