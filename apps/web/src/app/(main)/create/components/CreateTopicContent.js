'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { topicApi } from '@/lib/api';
import { toast } from 'sonner';
import TopicForm from '@/components/topic/TopicForm';
import RequireAuth from '@/components/auth/RequireAuth';

export default function CreateTopicContent() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    setSubmitting(true);

    try {
      const response = await topicApi.create({
        title: formData.title,
        content: formData.content,
        categoryId: formData.categoryId,
        tags: formData.tags,
      });

      if (response.requiresApproval) {
        toast.success(
          response.message || '您的话题已提交，等待审核后将公开显示'
        );
        router.push('/profile/topics');
      } else {
        toast.success(response.message || '话题发布成功！');
        router.push(`/topic/${response.topic?.id}`);
      }
    } catch (err) {
      console.error('发布话题失败:', err);
      toast.error(err.message || '发布话题失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <RequireAuth>
      <div className='container mx-auto px-4 py-6'>
        {/* 页面标题 */}
        <div className='mb-4'>
          <h1 className='text-2xl font-semibold mb-2'>发布新话题</h1>
          <p className='text-sm text-muted-foreground'>
            分享你的想法，开启一场精彩的讨论
          </p>
        </div>

        <TopicForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={submitting}
          submitButtonText='发布话题'
        />
      </div>
    </RequireAuth>
  );
}
