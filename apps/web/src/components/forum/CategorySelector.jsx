'use client';

import { useState, useEffect, useMemo } from 'react';
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

  // 使用 useMemo 缓存计算结果，避免每次渲染都重新计算
  const flatCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // 1. 构建 ID -> Node 映射 和 ParentID -> Children 映射
    const categoryMap = new Map();
    const childrenMap = new Map();

    // 初始化映射
    categories.forEach(cat => {
      // 浅拷贝对象，避免修改原数据
      categoryMap.set(cat.id, { ...cat, level: 0, children: [] });
      
      const pId = cat.parentId || null;
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId).push(cat.id);
    });

    // 2. 递归构建树形列表 (DFS)
    const result = [];
    
    // 排序函数
    const sortCats = (aId, bId) => {
      const a = categoryMap.get(aId);
      const b = categoryMap.get(bId);
      // 防止数据缺失
      if (!a || !b) return 0;
      
      if (a.position !== b.position) {
        return (a.position || 0) - (b.position || 0);
      }
      return (a.name || '').localeCompare(b.name || '');
    };

    const processNode = (id, level) => {
      const node = categoryMap.get(id);
      if (!node) return;

      // 排除逻辑
      if (excludeId && (node.id === excludeId || Number(node.id) === Number(excludeId))) {
        return;
      }
      
      // 顶级分类过滤
      if (onlyTopLevel && level > 0) {
        return;
      }

      // 设置层级和父名称 (虽然 SelectItem 里其实只需要 level)
      node.level = level;
      if (node.parentId && categoryMap.has(node.parentId)) {
        node.parentName = categoryMap.get(node.parentId).name;
      }
      node.displayName = node.name;

      result.push(node);

      // 处理子节点
      // 如果 onlyTopLevel 为 true，其实不需要递归处理子节点，但在 processNode 开头已拦截，为了性能可在此处提前判断
      if (onlyTopLevel) return;

      const childIds = childrenMap.get(id);
      if (childIds && childIds.length > 0) {
        childIds.sort(sortCats).forEach(childId => {
          processNode(childId, level + 1);
        });
      }
    };

    // 3. 从根节点 (parentId === null) 开始处理
    const rootIds = childrenMap.get(null);
    if (rootIds && rootIds.length > 0) {
       rootIds.sort(sortCats).forEach(id => {
         processNode(id, 0);
       });
    }

    return result;
  }, [categories, excludeId, onlyTopLevel]);

  // 获取选中分类的显示内容
  const renderSelectedValue = () => {
    if (!value) return placeholder;
    const category = categories.find((cat) => cat.id === Number(value));
    if (!category) return placeholder;

    return (
      <div className="flex items-center gap-2">
        {/* 分类颜色标识 */}
        {category.color && (
          <div
            className="h-3 w-3 rounded-sm shrink-0"
            style={{ backgroundColor: category.color }}
          />
        )}

        {/* 分类图标 */}
        {category.icon && (
          <span className="text-base shrink-0">{category.icon}</span>
        )}

        {/* 分类名称 */}
        <span className="truncate">
          {category.name}
        </span>
      </div>
    );
  };

  if (loading) {
// ... (omitted)
  }

  return (
    <Select
      value={value ? String(value) : 'none'}
      onValueChange={(val) => onChange(val === 'none' ? null : Number(val))}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {renderSelectedValue()}
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
