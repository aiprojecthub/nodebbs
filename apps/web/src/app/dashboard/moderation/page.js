'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { moderationApi } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, FileText, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Loading } from '@/components/common/Loading';
import Time from '@/components/forum/Time';

export default function ContentModerationPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({ totalTopics: 0, totalPosts: 0 });

  // 审核日志相关状态
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logFilters, setLogFilters] = useState({
    targetType: 'all',
    action: 'all',
  });

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else {
      loadPendingContent();
    }
  }, [activeTab, logsPage, logFilters]);

  const loadPendingContent = async () => {
    setLoading(true);
    try {
      const data = await moderationApi.getPending(activeTab, 1, 50);
      setItems(data.items || []);
      setStats({
        totalTopics: data.totalTopics || 0,
        totalPosts: data.totalPosts || 0,
      });
    } catch (error) {
      console.error('Failed to load pending content:', error);
      toast.error('加载待审核内容失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await moderationApi.getLogs({
        ...logFilters,
        page: logsPage,
        limit: 20,
      });
      setLogs(data.items || []);
      setLogsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load moderation logs:', error);
      toast.error('加载审核日志失败');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApprove = async (type, id) => {
    try {
      await moderationApi.approve(type, id);
      toast.success(`${type === 'topic' ? '话题' : '回复'}已批准`);
      loadPendingContent();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('批准失败');
    }
  };

  const handleReject = async (type, id) => {
    try {
      await moderationApi.reject(type, id);
      toast.success(`${type === 'topic' ? '话题' : '回复'}已拒绝`);
      loadPendingContent();
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error('拒绝失败');
    }
  };

  return (
    <div className='space-y-6'>
      {/* Page header */}
      <div>
        <h2 className='text-2xl font-semibold mb-2'>内容审核</h2>
        <p className='text-sm text-muted-foreground'>审核待发布的话题和回复</p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='border border-border rounded-lg p-4 bg-card'>
          <div className='flex items-center gap-3'>
            <Clock className='h-5 w-5 text-yellow-500' />
            <div>
              <p className='text-sm text-muted-foreground'>待审核话题</p>
              <p className='text-2xl font-semibold'>{stats.totalTopics}</p>
            </div>
          </div>
        </div>
        <div className='border border-border rounded-lg p-4 bg-card'>
          <div className='flex items-center gap-3'>
            <Clock className='h-5 w-5 text-yellow-500' />
            <div>
              <p className='text-sm text-muted-foreground'>待审核回复</p>
              <p className='text-2xl font-semibold'>{stats.totalPosts}</p>
            </div>
          </div>
        </div>
        <div className='border border-border rounded-lg p-4 bg-card'>
          <div className='flex items-center gap-3'>
            <Clock className='h-5 w-5 text-yellow-500' />
            <div>
              <p className='text-sm text-muted-foreground'>总计</p>
              <p className='text-2xl font-semibold'>
                {stats.totalTopics + stats.totalPosts}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value='all'>全部待审核</TabsTrigger>
          <TabsTrigger value='topic'>话题</TabsTrigger>
          <TabsTrigger value='post'>回复</TabsTrigger>
          <TabsTrigger value='logs'>审核日志</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className='space-y-4 mt-6'>
          {activeTab !== 'logs' ? (
            <>
              {loading ? (
                <Loading text='加载中...' />
              ) : items.length === 0 ? (
                <div className='border border-border rounded-lg p-12 bg-card'>
                  <div className='text-center text-muted-foreground'>
                    <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>暂无待审核内容</p>
                  </div>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className='border border-border rounded-lg p-6 bg-card hover:border-muted-foreground/50 transition-colors'
                  >
                    <div className='space-y-4'>
                      <div className='flex items-start justify-between'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-2'>
                            <Badge
                              variant={
                                item.type === 'topic' ? 'default' : 'secondary'
                              }
                            >
                              {item.type === 'topic' ? '话题' : '回复'}
                            </Badge>
                            <span className='text-sm text-muted-foreground'>
                              由 {item.username} 发布于{' '}
                              {new Date(item.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>

                          {item.type === 'topic' ? (
                            <div>
                              <h3 className='text-lg font-semibold mb-2'>
                                {item.title}
                              </h3>
                              {item.content && (
                                <p className='text-sm text-muted-foreground mb-2 line-clamp-3'>
                                  {item.content}
                                </p>
                              )}
                              <Link
                                href={`/topic/${item.id}`}
                                className='text-sm text-primary hover:underline'
                              >
                                查看详情 →
                              </Link>
                            </div>
                          ) : (
                            <div>
                              <p className='text-sm text-muted-foreground mb-2'>
                                回复话题:{' '}
                                <Link
                                  href={`/topic/${item.topicId}`}
                                  className='text-primary hover:underline'
                                >
                                  {item.topicTitle}
                                </Link>
                              </p>
                              <p className='text-sm line-clamp-3'>{item.content}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() => handleApprove(item.type, item.id)}
                          className='gap-2'
                        >
                          <CheckCircle className='h-4 w-4' />
                          批准
                        </Button>
                        <Button
                          size='sm'
                          variant='destructive'
                          onClick={() => handleReject(item.type, item.id)}
                          className='gap-2'
                        >
                          <XCircle className='h-4 w-4' />
                          拒绝
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {/* 审核日志筛选 */}
              <div className='flex gap-4 items-center'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-muted-foreground'>类型:</span>
                  <Select
                    value={logFilters.targetType}
                    onValueChange={(value) =>
                      setLogFilters({ ...logFilters, targetType: value })
                    }
                  >
                    <SelectTrigger className='w-[140px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部</SelectItem>
                      <SelectItem value='topic'>话题</SelectItem>
                      <SelectItem value='post'>回复</SelectItem>
                      <SelectItem value='user'>用户</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='flex items-center gap-2'>
                  <span className='text-sm text-muted-foreground'>操作:</span>
                  <Select
                    value={logFilters.action}
                    onValueChange={(value) =>
                      setLogFilters({ ...logFilters, action: value })
                    }
                  >
                    <SelectTrigger className='w-[140px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>全部</SelectItem>
                      <SelectItem value='approve'>批准</SelectItem>
                      <SelectItem value='reject'>拒绝</SelectItem>
                      <SelectItem value='delete'>删除</SelectItem>
                      <SelectItem value='restore'>恢复</SelectItem>
                      <SelectItem value='close'>关闭</SelectItem>
                      <SelectItem value='open'>打开</SelectItem>
                      <SelectItem value='pin'>置顶</SelectItem>
                      <SelectItem value='unpin'>取消置顶</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 审核日志列表 */}
              {logsLoading ? (
                <Loading text='加载中...' />
              ) : logs.length === 0 ? (
                <div className='border border-border rounded-lg p-12 bg-card'>
                  <div className='text-center text-muted-foreground'>
                    <FileText className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>暂无审核日志</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className='space-y-3'>
                    {logs.map((log) => {
                      const actionText = {
                        approve: '批准',
                        reject: '拒绝',
                        delete: '删除',
                        restore: '恢复',
                        close: '关闭',
                        open: '打开',
                        pin: '置顶',
                        unpin: '取消置顶',
                      }[log.action] || log.action;

                      const targetTypeText = {
                        topic: '话题',
                        post: '回复',
                        user: '用户',
                      }[log.targetType] || log.targetType;

                      const actionColor = {
                        approve: 'text-green-600',
                        reject: 'text-red-600',
                        delete: 'text-red-600',
                        restore: 'text-blue-600',
                        close: 'text-yellow-600',
                        open: 'text-green-600',
                        pin: 'text-blue-600',
                        unpin: 'text-gray-600',
                      }[log.action] || 'text-foreground';

                      const ActionIcon = {
                        approve: CheckCircle,
                        reject: XCircle,
                        topic: FileText,
                        post: MessageSquare,
                        user: User,
                      }[log.targetType] || FileText;

                      return (
                        <div
                          key={log.id}
                          className='border border-border rounded-lg p-4 bg-card hover:border-muted-foreground/30 transition-colors'
                        >
                          <div className='flex items-start gap-3'>
                            <ActionIcon className='h-5 w-5 mt-0.5 text-muted-foreground shrink-0' />
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 flex-wrap mb-2'>
                                <span className='font-medium'>
                                  {log.moderatorName || log.moderatorUsername}
                                </span>
                                <span className='text-muted-foreground'>
                                  <span className={actionColor}>{actionText}</span>
                                  了{targetTypeText}
                                </span>
                                {log.targetInfo && (
                                  <>
                                    {log.targetType === 'topic' && (
                                      <Link
                                        href={`/topic/${log.targetId}`}
                                        className='text-primary hover:underline truncate'
                                      >
                                        「{log.targetInfo.title}」
                                      </Link>
                                    )}
                                    {log.targetType === 'post' && (
                                      <span className='text-sm text-muted-foreground truncate'>
                                        「{log.targetInfo.content}」
                                      </span>
                                    )}
                                    {log.targetType === 'user' && (
                                      <span className='text-sm font-medium'>
                                        @{log.targetInfo.username}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {log.reason && (
                                <p className='text-sm text-muted-foreground mb-2'>
                                  原因: {log.reason}
                                </p>
                              )}
                              {log.previousStatus && log.newStatus && (
                                <p className='text-xs text-muted-foreground'>
                                  状态: {log.previousStatus} → {log.newStatus}
                                </p>
                              )}
                              <p className='text-xs text-muted-foreground mt-2'>
                                <Time date={log.createdAt} />
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 分页 */}
                  {logsTotal > 20 && (
                    <div className='flex justify-center items-center gap-4 mt-6'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={logsPage === 1}
                        onClick={() => setLogsPage(logsPage - 1)}
                      >
                        上一页
                      </Button>
                      <span className='text-sm text-muted-foreground'>
                        第 {logsPage} 页 / 共 {Math.ceil(logsTotal / 20)} 页
                      </span>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={logsPage * 20 >= logsTotal}
                        onClick={() => setLogsPage(logsPage + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
