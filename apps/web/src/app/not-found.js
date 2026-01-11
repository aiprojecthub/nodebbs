'use client';

import Link from '@/components/common/Link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mt-16 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="text-6xl font-bold text-muted-foreground mb-4">404</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">页面未找到</h1>
          <p className="text-muted-foreground mb-6">
            抱歉，您访问的页面不存在或已被删除。
          </p>
          
          <div className="space-y-3">
            <Link href="/" className="block">
              <Button className="w-full">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              返回上一页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}