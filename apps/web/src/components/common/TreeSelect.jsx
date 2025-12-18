'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loading } from './Loading';

/**
 * 树形选择器通用组件
 * @param {Object} props
 * @param {Array} props.items - 嵌套结构的数据 [{ label, value, children: [] }]
 * @param {string|number} props.value - 当前选中的值
 * @param {Function} props.onChange - 选择变化回调
 * @param {string} props.placeholder - 占位符
 * @param {boolean} props.disabled - 是否禁用
 * @param {boolean} props.loading - 是否加载中
 * @param {Function} props.renderOption - 自定义选项渲染 (option) => ReactNode
 * @param {Function} props.renderSelected - 自定义选中值渲染 (selectedOption) => ReactNode
 * @param {string} props.className - 自定义样式类
 */
export default function TreeSelect({
  items = [],
  value,
  onChange,
  placeholder = '请选择',
  disabled = false,
  loading = false,
  renderOption,
  renderSelected,
  className = '',
}) {
  if (loading) {
    return (
      <div
        className={`flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 ${className}`}
      >
        <Loading text='加载中...' size='sm' variant='inline' />
      </div>
    );
  }
  // 将嵌套结构展平为一维数组 (带层级信息)，用于 SelectItem 渲染
  const flattenedOptions = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    const result = [];
    
    const traverse = (nodes, level = 0) => {
      nodes.forEach(node => {
        // 创建扁平化节点，保留原始数据
        result.push({
          ...node,
          level,
          raw: node
        });
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      });
    };
    
    traverse(items, 0);
    return result;
  }, [items]);

  // 根据当前 value 查找选中的选项对象 (递归查找)
  const findOption = (nodes, val) => {
    for (const node of nodes) {
      // 注意：这里做弱类型比较，兼容 string/number
      if (String(node.value) === String(val)) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findOption(node.children, val);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return findOption(items, value);
  }, [value, items]);

  return (
    <Select
      value={value ? String(value) : 'none'}
      onValueChange={(val) => onChange(val === 'none' ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedOption 
            ? (renderSelected ? renderSelected(selectedOption) : selectedOption.label)
            : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* 空值/取消选择选项 */}
        <SelectItem value="none" className="cursor-pointer">
          <span className="text-muted-foreground">{placeholder}</span>
        </SelectItem>

        {flattenedOptions.length === 0 ? (
          <div className="py-2 text-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          flattenedOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={String(option.value)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {/* 缩进渲染 */}
                {option.level > 0 && (
                  <>
                    <span style={{ width: `${(option.level - 1) * 16}px` }} />
                    <span className="text-muted-foreground text-xs">└─</span>
                  </>
                )}
                
                {/* 选项内容渲染 */}
                {renderOption ? renderOption(option) : <span>{option.label}</span>}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
