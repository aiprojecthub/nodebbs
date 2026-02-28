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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Inbox, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pager } from './Pagination';
import { Skeleton } from '@/components/ui/skeleton';

// 自定义 Table 包装器，移除默认的滚动容器以支持 sticky 列
function TableWrapper({ className, children, ...props }) {
  return (
    <div className='relative w-full overflow-x-auto custom-scrollbar'>
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
 * 通用数据表格组件 - Pro Max Version
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
      // sticky 列默认使用最小内容宽度（除非显式设置了 width）
      if (!column.width) {
        style.width = '1%';
      }

      if (column.sticky === 'left') {
        style.left = '0';
        style.zIndex = 20;
      } else if (column.sticky === 'right') {
        style.right = '0';
        style.zIndex = 20;
      }
    }

    return style;
  };

  // 获取列的类名
  const getColumnClassName = (column, isHeader = false) => {
    const classes = [column.width, 'transition-colors'];

    if (column.sticky) {
      classes.push('sticky');
      
      // 背景色 - 使用 backdrop-blur 实现毛玻璃效果，但为了 sticky 需要有背景色
      if (isHeader) {
        classes.push('bg-muted/90 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/60');
      } else {
        classes.push('bg-card/90 backdrop-blur-sm supports-[backdrop-filter]:bg-card/60 group-hover:bg-accent/90 transition-colors');
      }

      // 边框 - 移除阴影
      if (column.sticky === 'left') {
        classes.push('border-r border-border/50');
      } else if (column.sticky === 'right') {
        classes.push('border-l border-border/50');
      }
    }

    return classes.filter(Boolean).join(' ');
  };

  return (
    <div className='space-y-4'>
      {/* 搜索和过滤栏 */}
      {(search || filterList.length > 0) && (
        <div className='flex flex-col sm:flex-row gap-4 p-1'>
          {search && (
            <div className='flex-1'>
              <div className='relative group'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                <Input
                  placeholder={search.placeholder || '搜索...'}
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  className='pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary/50 focus:ring-primary/20 transition-all hover:bg-background/80'
                />
              </div>
            </div>
          )}
          {filterList.map((filterItem, index) => (
            <div key={index} className={filterItem.width || 'w-full sm:w-45'}>
              {filterItem.label && (
                <label className='text-xs font-medium text-muted-foreground mb-1.5 block ml-1'>
                  {filterItem.label}
                </label>
              )}
              <Select value={filterItem.value} onValueChange={filterItem.onChange}>
                <SelectTrigger className='w-full bg-background/50 border-muted-foreground/20 hover:bg-background/80 transition-all'>
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

      {/* 表格容器 */}
      <div className='relative bg-card/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden transition-all hover:border-border/80'>
        
        {/* Loading Overlay - 仅在非初始加载（已有数据）时显示 */}
        {loading && data.length > 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[2px] transition-all duration-300">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background/80 animate-in fade-in zoom-in-95 duration-200">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="text-xs font-medium text-muted-foreground">加载中...</span>
            </div>
          </div>
        )}

        <TableWrapper>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b border-border/50">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    'h-12 text-xs uppercase tracking-wider font-semibold text-muted-foreground',
                    getColumnClassName(column, true)
                  )}
                  style={getColumnStyle(column)}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && data.length === 0 ? (
              // Skeleton Loading State - 仅在初始加载（无数据）时显示
              Array.from({ length: Math.max(pagination?.limit || 5, 5) }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="border-b border-border/40 hover:bg-transparent">
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={`skeleton-cell-${colIndex}`}
                      className={cn(getColumnClassName(column, false))}
                      style={getColumnStyle(column)}
                    >
                      <Skeleton className="h-5 w-full bg-primary/5 rounded opacity-70" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-muted-foreground/60">
                    <div className="p-4 rounded-full bg-muted/30 mb-2">
                      <Inbox className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                    {search?.value && (
                      <p className="text-xs text-muted-foreground/40">
                        试试通过其他关键词搜索
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              data.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  onClick={() => !loading && onRowClick?.(row)}
                  className={cn(
                    'group border-b border-border/40 transition-all duration-200',
                    onRowClick ? 'cursor-pointer hover:bg-accent/40 hover:shadow-sm' : 'hover:bg-accent/50',
                    loading && 'opacity-50 pointer-events-none' // 加载时禁用交互但保持可见
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        'py-3 text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors',
                        getColumnClassName(column, false)
                      )}
                      style={getColumnStyle(column)}
                    >
                      {column.render
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </TableWrapper>

        {/* 分页 */}
        {pagination && (totalPages > 1 || loading) && (
          <div className='flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/20'>
            <div className='flex items-center gap-2'>
              {loading ? (
                <Skeleton className="h-4 w-32 bg-primary/5" />
              ) : (
                <div className='text-xs font-medium text-muted-foreground'>
                  共 <span className="text-foreground">{pagination.total}</span> 条，
                  第 <span className="text-foreground">{pagination.page}</span> / {totalPages} 页
                </div>
              )}
            </div>
            
            {!loading && (
              <Pager
                total={pagination.total}
                page={pagination.page}
                pageSize={pagination.limit}
                onPageChange={pagination.onPageChange}
                className="scale-90 origin-right py-0"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
