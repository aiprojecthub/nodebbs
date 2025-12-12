import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy } from 'lucide-react';
import { Loading } from '@/components/common/Loading';
import { Pager } from '@/components/common/Pagination';
import TimeAgo from '@/components/forum/TimeAgo';
import { TransactionTypeBadge } from '../shared/TransactionTypeBadge';
import { formatCreditsWithSign, getCreditsColorClass } from '../../utils/formatters';

/**
 * 带分页的用户交易历史表格
 * @param {Object} props
 * @param {Array} props.transactions - 交易对象数组
 * @param {boolean} props.loading - 加载状态
 * @param {Object} props.pagination - 分页信息 { page, total, limit }
 * @param {Function} props.onPageChange - 页面改变时的回调
 */
export function TransactionHistory({ transactions, loading, pagination, onPageChange }) {
  const { page, total, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>交易记录</CardTitle>
        <CardDescription>查看你的所有积分变动记录</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loading text="加载中..." className="py-8" />
        ) : transactions.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead className="text-right">变动</TableHead>
                    <TableHead className="text-right">余额</TableHead>
                    <TableHead className="text-right">时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getCreditsColorClass(tx.amount)}>
                          {formatCreditsWithSign(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{tx.balance}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        <TimeAgo date={tx.createdAt} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pager
                  total={total}
                  page={page}
                  pageSize={limit}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              暂无交易记录
            </h3>
            <p className="text-muted-foreground">
              开始参与社区活动来获得积分吧！
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
