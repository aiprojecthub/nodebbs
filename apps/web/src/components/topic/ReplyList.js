'use client';

import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Pager } from '@/components/common/Pagination';
import { useRouter } from 'next/navigation';
import ReplyItem from './ReplyItem';

const ReplyList = forwardRef(function ReplyList(
  {
    topicId,
    initialPosts,
    totalPosts: initialTotalPosts,
    totalPages,
    currentPage,
    limit,
  },
  ref
) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [totalPosts, setTotalPosts] = useState(initialTotalPosts);
  const repliesContainerRef = useRef(null);

  // 当服务端数据更新时（分页切换），更新本地状态
  useEffect(() => {
    setPosts(initialPosts);
    setTotalPosts(initialTotalPosts);
  }, [initialPosts, initialTotalPosts]);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    addPost: (newPost) => {
      setPosts((prevPosts) => [...prevPosts, newPost]);
      setTotalPosts((prev) => prev + 1);
    },
  }));

  const handlePageChange = (page) => {
    // 使用 URL 参数进行分页，触发服务端重新渲染
    // scroll: false 禁用 Next.js 默认滚动行为
    router.push(`/topic/${topicId}?page=${page}`, { scroll: false });

    // 滚动到回复列表顶部
    setTimeout(() => {
        repliesContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
  };

  // 更新本地回复列表（用于删除等操作）
  const handlePostDeleted = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    setTotalPosts((prev) => Math.max(prev - 1, 0));
  };

  // 添加新回复到列表
  const handleReplyAdded = (newPost) => {
    setPosts((prevPosts) => [...prevPosts, newPost]);
    setTotalPosts((prev) => prev + 1);
  };

  return (
    <div className='space-y-4' >
      <div ref={repliesContainerRef} className='relative -top-16'/>
      {totalPosts > 0 && (
        <div className='flex items-center space-x-2 text-sm text-muted-foreground/70 mb-4'>
          <MessageSquare className='h-4 w-4' />
          <span className='font-medium'>{totalPosts} 条回复</span>
        </div>
      )}

      {posts.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          topicId={topicId}
          onDeleted={handlePostDeleted}
          onReplyAdded={handleReplyAdded}
        />
      ))}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className='mb-6'>
          <Pager
            total={totalPosts}
            page={currentPage}
            pageSize={limit}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
});

export default ReplyList;
