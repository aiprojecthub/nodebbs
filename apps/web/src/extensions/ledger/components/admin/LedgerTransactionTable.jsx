import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { DataTable } from '@/components/forum/DataTable';
import { Loading } from '@/components/common/Loading';
import TimeAgo from '@/components/forum/TimeAgo';
import { TransactionTypeBadge } from '../../../rewards/components/shared/TransactionTypeBadge';

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
 */
export function LedgerTransactionTable({ transactions, loading, pagination }) {
  const columns = [
    {
      label: 'ID',
      key: 'id',
      render: (value) => <span className="text-muted-foreground">#{value}</span>,
    },
    {
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
    },
    {
      label: '应用货币',
      key: 'currencyCode',
      render: (value) => <span className="font-mono text-xs">{value}</span>
    },
    {
      label: '类型',
      key: 'type',
      render: (value) => <TransactionTypeBadge type={value} />,
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
      render: (value) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{value || '-'}</span>
      ),
    },
    {
      label: '时间',
      key: 'createdAt',
      render: (value) => <TimeAgo date={value} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <CardDescription>查看系统中的所有交易流水</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading text="加载中..." className="py-12" />
        ) : (
          <DataTable
            columns={columns}
            data={transactions}
            pagination={pagination}
            emptyMessage="暂无交易记录"
          />
        )}
      </CardContent>
    </Card>
  );
}
