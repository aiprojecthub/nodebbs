import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/common/DataTable';
import { Loading } from '@/components/common/Loading';
import { TransactionTypeBadge } from './TransactionTypeBadge';
import Time from '@/components/common/Time';

// 简单的辅助函数，避免依赖 rewards 扩展
function formatAmount(amount) {
    if (typeof amount !== 'number') return '0';
    const sign = amount > 0 ? '+' : '';
    return `${sign}${amount.toLocaleString()}`;
}

function getAmountColorClass(amount) {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-muted-foreground';
}

/**
 * 带有搜索功能的账本交易历史表格 (通用版)
 * @param {Object} props
 * @param {Array} props.transactions - 交易记录数组
 * @param {boolean} props.loading - 加载状态
 * @param {Object} props.pagination - 分页信息 { page, total, limit, onPageChange }
 * @param {boolean} [props.showUserColumn=true] - 是否显示用户列 (用户自己查看时不需要)
 * @param {boolean} [props.compact=false] - 是否紧凑模式 (无 Card 外壳)
 */
export function LedgerTransactionTable({ 
  transactions, 
  loading, 
  pagination, 
  showUserColumn = true, 
  compact = false 
}) {
  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (value) => <span className="text-muted-foreground">#{value}</span>,
    },
    ...(showUserColumn ? [{
      label: '用户',
      key: 'username',
      render: (value, row) => (
        <a
          href={`/users/${row.username}`}
          className="hover:underline text-primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.username}
        </a>
      ),
    }] : []),
    {
      label: '应用货币',
      key: 'currencyName',
      render: (value, row) => (
        <span className="text-sm" title={row.currencyCode}>
          {value || row.currencyCode}
        </span>
      )
    },
    {
      label: '类型',
      key: 'type',
      render: (value, row) => {
        let meta = row.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch (e) {
            // ignore error
          }
        }
        return <TransactionTypeBadge type={value} amount={row.amount} meta={meta} />;
      },
    },
    {
      label: '金额',
      key: 'amount',
      render: (value) => (
        <span className={`font-semibold ${getAmountColorClass(value)}`}>
          {formatAmount(value)}
        </span>
      ),
    },
    {
      label: '余额',
      key: 'balance',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      label: '描述',
      key: 'description',
    render: (value, row) => {
        let meta = row.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch (e) {
            console.error('Failed to parse metadata:', e);
          }
        }
        
        const hasBonus = meta && meta.effectBonus > 0;
        
        // 检查特定交易类型
        // 1. 帖子打赏
        if (row.type === 'reward_post') {
            const isTopic = meta.isTopic;
            const topicId = meta.topicId;
            const relatedPostId = meta.relatedPostId; // 这里实际上是 postId
            const isIncoming = row.amount > 0; // 正数表示收入

            let text = isIncoming
                ? (isTopic ? '收到话题打赏' : '收到回复打赏')
                : (isTopic ? '打赏话题' : '打赏回复');
            
            // 兼容旧数据（没有 meta.isTopic 的情况）
            if (meta.isTopic === undefined && !meta.topicId) {
                 text = meta.message || (isIncoming ? '收到打赏' : '打赏帖子');
            }

            // 如果存在勋章加成信息（来自之前的任务）
            const badgeInfo = hasBonus ? (
                 <span className="ml-2 text-xs text-amber-600 font-medium whitespace-nowrap">
                   (勋章加成 +{meta.effectBonus})
                 </span>
            ) : null;

            if (topicId) {
                // 使用 relatedPostId (postId) 作为锚点，以满足 TopicPageClient 的要求
                const anchor = relatedPostId ? `#post-${relatedPostId}` : '';
                return (
                     <div className="flex flex-col">
                        <span className="text-sm">
                            <a 
                                href={`/topic/${topicId}${anchor}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary"
                            >
                                {text}
                            </a>
                            {badgeInfo}
                        </span>
                        {meta.message && (
                            <span className="text-xs text-muted-foreground line-clamp-1">
                                留言: {meta.message}
                            </span>
                        )}
                    </div>
                );
            }
        }

        return (
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground line-clamp-1">
              {value || '-'}
              {hasBonus && (
                <span className="ml-2 text-xs text-amber-600 font-medium">
                  (勋章加成 +{meta.effectBonus})
                </span>
              )}
            </span>
          </div>
        );
      },
    },
    {
      label: '时间',
      key: 'createdAt',
      render: (value) => <Time date={value} fromNow />,
    },
  ];

  const content = loading ? (
    <Loading text="加载中..." className="py-12" />
  ) : (
    <DataTable
      columns={columns}
      data={transactions}
      pagination={pagination}
      emptyMessage="暂无交易记录"
    />
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="shadow-none bg-transparent border-0">
      <CardHeader className="px-0">
          <CardTitle>交易记录</CardTitle>
          <CardDescription>查看所有交易流水</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {content}
      </CardContent>
    </Card>
  );
}
