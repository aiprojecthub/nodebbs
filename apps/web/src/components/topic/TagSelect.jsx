'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@uidotdev/usehooks';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { X, Check, Plus, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tagApi } from '@/lib/api';

/**
 * 标签异步搜索多选组件
 *
 * @param {string[]} value - 已选标签名数组
 * @param {(tags: string[]) => void} onChange - 更新回调
 * @param {number} maxTags - 最大标签数
 * @param {boolean} canCreateTag - 是否允许创建新标签
 */
export default function TagSelect({
  value = [],
  onChange,
  maxTags = 5,
  canCreateTag = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const isMaxed = value.length >= maxTags;

  // 搜索标签
  const fetchTags = useCallback(async (query) => {
    setLoading(true);
    try {
      const res = await tagApi.getAll(query, 20);
      setOptions(res.items || []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时或搜索词变化时加载标签
  useEffect(() => {
    if (open) {
      fetchTags(debouncedSearch);
    }
  }, [open, debouncedSearch, fetchTags]);

  const handleSelect = (tagName) => {
    if (value.includes(tagName)) {
      // 取消选择
      onChange(value.filter((t) => t !== tagName));
    } else if (!isMaxed) {
      // 添加选择
      onChange([...value, tagName]);
    }
  };

  const handleRemove = (tagName) => {
    onChange(value.filter((t) => t !== tagName));
  };

  const handleCreate = () => {
    const trimmed = search.trim();
    if (trimmed && !isMaxed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setSearch('');
    }
  };

  // 判断是否显示创建选项：搜索内容不为空 + 无精确匹配 + 有创建权限 + 未达上限
  const trimmedSearch = search.trim();
  const hasExactMatch = options.some(
    (opt) => opt.name.toLowerCase() === trimmedSearch.toLowerCase()
  );
  const showCreateOption =
    canCreateTag && trimmedSearch && !hasExactMatch && !isMaxed;

  return (
    <div className="space-y-2">
      {/* 已选标签 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 下拉搜索 */}
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild disabled={isMaxed}>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={isMaxed}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <span className="text-muted-foreground truncate">
              {isMaxed ? `已达上限 ${maxTags} 个` : '搜索或选择标签...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="搜索标签..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {options.length === 0 && !showCreateOption && (
                    <CommandEmpty>
                      {trimmedSearch ? '未找到匹配标签' : '暂无标签'}
                    </CommandEmpty>
                  )}
                  {options.length > 0 && (
                    <CommandGroup>
                      {options.map((opt) => {
                        const isSelected = value.includes(opt.name);
                        return (
                          <CommandItem
                            key={opt.id}
                            value={opt.name}
                            onSelect={() => handleSelect(opt.name)}
                            disabled={isMaxed && !isSelected}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="flex-1 truncate">{opt.name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                  {showCreateOption && (
                    <CommandGroup>
                      <CommandItem onSelect={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span>
                          创建标签: <strong>{trimmedSearch}</strong>
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
