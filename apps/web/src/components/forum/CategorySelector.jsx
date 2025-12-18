'use client';

import { useState, useEffect, useMemo } from 'react';
import TreeSelect from '../common/TreeSelect';
import { categoryApi } from '@/lib/api';
import { toast } from 'sonner';

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

  // 将扁平 API 数据转换为 TreeSelect 需要的嵌套结构
  const treeData = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    
    // 1. 构建 ID -> Node 映射 和 ParentID -> Children 映射
    const categoryMap = new Map();
    const childrenMap = new Map();

    // 初始化映射
    categories.forEach(cat => {
      // 转换为 TreeSelect 标准格式 { label, value, children, ...original }
      const node = {
        value: cat.id,
        label: cat.name,
        children: [],
        ...cat // 保留颜色图标等原始数据
      };
      
      categoryMap.set(cat.id, node);
      
      const pId = cat.parentId || null;
      if (!childrenMap.has(pId)) {
        childrenMap.set(pId, []);
      }
      childrenMap.get(pId).push(cat.id);
    });

    // 2. 递归构建树
    const buildTree = (parentId) => {
      const childIds = childrenMap.get(parentId);
      if (!childIds) return [];

      // 排序: position -> name
      const sortedIds = childIds.sort((aId, bId) => {
        const a = categoryMap.get(aId);
        const b = categoryMap.get(bId);
        if (a.position !== b.position) {
          return (a.position || 0) - (b.position || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      return sortedIds
        .map(id => {
           const node = categoryMap.get(id);
           
           // 处理排除逻辑 (如果是被排除的节点，返回 null，最后 filter 掉)
           if (excludeId && (node.value === excludeId || Number(node.value) === Number(excludeId))) {
             return null;
           }

           const children = buildTree(id);
           
           // 处理 onlyTopLevel 逻辑 (如果有子节点但 onlyTopLevel=true，则清空子节点)
           if (onlyTopLevel) {
             node.children = [];
           } else {
             node.children = children;
           }
           
           return node;
        })
        .filter(Boolean); // 过滤掉 null
    };

    // 从根节点开始构建
    return buildTree(null);

  }, [categories, excludeId, onlyTopLevel]);

  return (
    <TreeSelect
      items={treeData}
      loading={loading}
      value={value ? Number(value) : null}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      // 自定义选项渲染
      renderOption={(option) => (
        <>
          {option.color && (
            <div
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: option.color }}
            />
          )}
          {option.icon && (
            <span className="text-base shrink-0">{option.icon}</span>
          )}
          <span>{option.label}</span>
        </>
      )}
      // 自定义选中值渲染
      renderSelected={(option) => (
         <div className="flex items-center gap-2">
           {option.color && (
             <div
               className="h-3 w-3 rounded-sm shrink-0"
               style={{ backgroundColor: option.color }}
             />
           )}
           {option.icon && (
             <span className="text-base shrink-0">{option.icon}</span>
           )}
           <span className="truncate">{option.label}</span>
         </div>
      )}
    />
  );
}
