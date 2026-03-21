import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className='container mx-auto px-4 py-6 flex-1'>
      <div className='text-center py-16 border border-border rounded-lg bg-card'>
        <div className='text-destructive font-semibold mb-2'>
          话题不存在
        </div>
        <p className='text-muted-foreground mb-4'>
          该话题可能已被删除或不存在
        </p>
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Link href='/'>
            <Button size='sm' variant='outline'>
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
