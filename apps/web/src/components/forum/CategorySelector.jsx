'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoryApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Loading } from '../common/Loading';

/**
 * 分类选择器组件 - 支持树型展示
 * @param {Object} props
 * @param {string|number} props.value - 当前选中的分类 ID
 * @param {Function} props.onChange - 选择变化回调
 * @param {string} props.placeholder - 占位符文本
 * @param {boolean} props.disabled - 是否禁用
 * @param {number} props.excludeId - 排除的分类 ID（用于编辑时排除自己）
 * @param {boolean} props.onlyTopLevel - 只显示顶级分类
 * @param {string} props.className - 自定义样式类
 */
export default function CategorySelector({
  value,
  onChange,
  placeholder = '选择分类',
  disabled = false,
  excludeId = null,
  onlyTopLevel = false,
  className = '',
}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoryApi.getAll();
      setCategories(data || []);
    } catch (err) {
      console.error('获取分类列表失败:', err);
      toast.error('获取分类列表失败');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // 构建分类层级结构，计算层级和父分类名称
  const buildCategoryHierarchy = (cats) => {
    // 创建分类映射表
    const categoryMap = new Map();
    cats.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, level: 0, parentName: '' });
    });

    // 计算每个分类的层级
    const calculateLevel = (catId, visited = new Set()) => {
      if (visited.has(catId)) return 0; // 防止循环引用
      visited.add(catId);

      const cat = categoryMap.get(catId);
      if (!cat || !cat.parentId) return 0;

      const parent = categoryMap.get(cat.parentId);
      if (!parent) return 0;

      return 1 + calculateLevel(cat.parentId, visited);
    };

    // 为每个分类设置层级和父分类名称
    cats.forEach((cat) => {
      const level = calculateLevel(cat.id);
      const parent = cat.parentId ? categoryMap.get(cat.parentId) : null;

      categoryMap.set(cat.id, {
        ...cat,
        level,
        displayName: cat.name,
        parentName: parent ? parent.name : '',
      });
    });

    return Array.from(categoryMap.values());
  };

  // 将分类按树形结构展开（父分类后面紧跟子分类）
  const flattenInTreeOrder = (cats) => {
    const processedCategories = buildCategoryHierarchy(cats);
    const result = [];

    // 按 position 和 name 排序的辅助函数
    const sortByPositionAndName = (a, b) => {
      if (a.position !== b.position) {
        return (a.position || 0) - (b.position || 0);
      }
      return a.name.localeCompare(b.name);
    };

    // 递归添加分类及其子分类
    const addCategoryAndChildren = (parentId, currentLevel = 0) => {
      // 找到所有属于当前父分类的子分类
      const children = processedCategories
        .filter((cat) => {
          if (parentId === null) {
            return cat.parentId === null;
          }
          return cat.parentId === parentId;
        })
        .sort(sortByPositionAndName);

      // 添加每个分类及其子分类
      children.forEach((cat) => {
        // 排除指定的分类
        if (excludeId && cat.id === excludeId) {
          return;
        }

        // 如果只显示顶级分类，跳过子分类
        if (onlyTopLevel && currentLevel > 0) {
          return;
        }

        result.push(cat);

        // 递归添加子分类（如果不是只显示顶级分类）
        if (!onlyTopLevel) {
          addCategoryAndChildren(cat.id, currentLevel + 1);
        }
      });
    };

    // 从顶级分类开始
    addCategoryAndChildren(null, 0);

    return result;
  };

  // 处理分类列表
  const flatCategories = flattenInTreeOrder(categories);

  // 获取选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!value) return null;
    const category = categories.find((cat) => cat.id === Number(value));
    return category ? category.name : null;
  };

  if (loading) {
    return (
      <div
        className={`flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 ${className}`}
      >
        <Loading text='加载中...' size='sm' variant='inline' />
      </div>
    );
  }

  return (
    <Select
      value={value ? String(value) : 'none'}
      onValueChange={(val) => onChange(val === 'none' ? null : Number(val))}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value ? getSelectedCategoryName() : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* 添加"无"选项 */}
        <SelectItem value='none' className='cursor-pointer'>
          <span className='text-muted-foreground'>{placeholder}</span>
        </SelectItem>

        {flatCategories.length === 0 ? (
          <div className='py-6 text-center text-sm text-muted-foreground'>
            暂无分类
          </div>
        ) : (
          flatCategories.map((category) => (
            <SelectItem
              key={category.id}
              value={String(category.id)}
              className='cursor-pointer'
            >
              <div className='flex items-center gap-2'>
                {/* 层级缩进 - 使用空白占位 + 符号 */}
                {category.level > 0 && (
                  <>
                    <span style={{ width: `${(category.level - 1) * 16}px` }} />
                    <span className='text-muted-foreground text-xs'>└─</span>
                  </>
                )}

                {/* 分类颜色标识 */}
                {category.color && (
                  <div
                    className='h-3 w-3 rounded-sm shrink-0'
                    style={{ backgroundColor: category.color }}
                  />
                )}

                {/* 分类图标 */}
                {category.icon && (
                  <span className='text-base shrink-0'>{category.icon}</span>
                )}

                {/* 分类名称 */}
                <span
                  className={category.level > 0 ? 'text-sm' : 'font-medium'}
                >
                  {category.displayName}
                </span>

                {/* 层级指示器（可选） */}
                {category.level > 0 && category.parentName && (
                  <span className='text-xs text-muted-foreground'>
                    ({category.parentName})
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
