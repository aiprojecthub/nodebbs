'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loading } from './Loading';
import { Pager } from './Pagination';

// 自定义 Table 包装器，移除默认的滚动容器以支持 sticky 列
function TableWrapper({ className, children, ...props }) {
  return (
    <div className='relative w-full overflow-x-auto'>
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

/**
 * 通用数据表格组件
 * @param {Object} props
 * @param {Array} props.columns - 列配置 [{ key, label, width, render, align, sticky }]
 *   - sticky: 'left' | 'right' 固定列位置
 * @param {Array} props.data - 数据数组
 * @param {boolean} props.loading - 加载状态
 * @param {Object} props.pagination - 分页配置 { page, total, limit, onPageChange }
 * @param {Object} props.search - 搜索配置 { value, onChange, placeholder }
 * @param {Object} props.filter - 单个过滤配置 { value, onChange, options, label?, width? }
 * @param {Array} props.filters - 多个过滤配置 [{ value, onChange, options, label?, width? }]
 * @param {string} props.emptyMessage - 空数据提示
 * @param {Function} props.onRowClick - 行点击事件
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  pagination,
  search,
  filter,
  filters,
  emptyMessage = '暂无数据',
  onRowClick,
}) {
  // 向后兼容：如果传入 filter 但没有 filters，将其转换为 filters 数组
  const filterList = filters || (filter ? [filter] : []);
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;

  // 获取列的样式（包括固定定位）
  const getColumnStyle = (column) => {
    const style = {};

    if (column.align) {
      style.textAlign = column.align;
    }

    if (column.sticky) {
      if (column.sticky === 'left') {
        style.left = '0';
        style.boxShadow = '2px 0 5px -2px rgba(0, 0, 0, 0.1)';
      } else if (column.sticky === 'right') {
        style.right = '0';
        style.boxShadow = '-2px 0 5px -2px rgba(0, 0, 0, 0.1)';
      }
    }

    return style;
  };

  // 获取列的类名
  const getColumnClassName = (column, isHeader = false) => {
    const classes = [column.width];

    if (column.sticky) {
      classes.push('sticky z-10');

      // 背景色
      if (isHeader) {
        classes.push('bg-muted');
      } else {
        classes.push('bg-card');
      }

      // 边框
      if (column.sticky === 'left') {
        classes.push('border-r border-border');
      } else if (column.sticky === 'right') {
        classes.push('border-l border-border');
      }
    }

    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className='space-y-4'>
      {/* 搜索和过滤栏 */}
      {(search || filterList.length > 0) && (
        <div className='flex flex-col sm:flex-row gap-4'>
          {search && (
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder={search.placeholder || '搜索...'}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  className='pl-9'
                />
              </div>
            </div>
          )}
          {filterList.map((filterItem, index) => (
            <div key={index} className={filterItem.width || 'w-full sm:w-[180px]'}>
              {filterItem.label && (
                <label className='text-xs text-muted-foreground mb-1 block'>
                  {filterItem.label}
                </label>
              )}
              <Select value={filterItem.value} onValueChange={filterItem.onChange}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterItem.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* 表格 */}
      <div className='bg-card border border-border rounded-lg overflow-hidden'>
        {loading ? (
          <Loading text='加载中...' className='py-12' />
        ) : data.length === 0 ? (
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>{emptyMessage}</p>
          </div>
        ) : (
          <>
            <TableWrapper>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={getColumnClassName(column, true)}
                      style={getColumnStyle(column)}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow
                    key={row.id || rowIndex}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer' : ''}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={getColumnClassName(column, false)}
                        style={getColumnStyle(column)}
                      >
                        {column.render
                          ? column.render(row[column.key], row, rowIndex)
                          : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </TableWrapper>

            {/* 分页 */}
            {pagination && totalPages > 1 && (
              <div className='flex items-center justify-between px-4 py-3 border-t border-border'>
                <div className='text-sm text-muted-foreground'>
                  共 {pagination.total} 条，第 {pagination.page} / {totalPages}{' '}
                  页
                </div>
                <Pager
                  total={pagination.total}
                  page={pagination.page}
                  pageSize={pagination.limit}
                  onPageChange={pagination.onPageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
