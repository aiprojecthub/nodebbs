'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import MultiSelect from '@/components/common/MultiSelect';

/**
 * 条件字段容器组件
 * 统一处理标题、描述、清除按钮等公共功能
 */
function ConditionField({ label, description, hasValue, onClear, children, inline = false }) {
  return (
    <div className="py-3 border-b last:border-b-0">
      {inline ? (
        // 行内布局（用于 switch）
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{label}</Label>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {children}
        </div>
      ) : (
        // 堆叠布局（默认）
        <div className="space-y-2">
          <div className="min-h-6 flex items-center justify-between">
            <Label className="text-sm font-medium">{label}</Label>
            {hasValue && onClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-6 h-6 text-muted-foreground hover:text-destructive"
                onClick={onClear}
              >
                <Trash className="h-3 w-3" />
              </Button>
            )}
          </div>
          {children}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
    </div>
  );
}

/**
 * 条件编辑器组件
 * 根据条件类型渲染对应的输入控件
 */
export function ConditionEditor({
  conditions,
  permission,
  onChange,
  disabled,
  hasConfig,
  conditionTypes = [],
  dynamicDataSources = {},
}) {
  const [open, setOpen] = useState(false);
  const [localConditions, setLocalConditions] = useState(conditions || {});

  // 当外部 conditions 变化时同步
  useEffect(() => {
    setLocalConditions(conditions || {});
  }, [conditions]);

  const handleSave = () => {
    // 清理空值
    const cleaned = Object.entries(localConditions).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '' && value !== false) {
        if (Array.isArray(value) && value.length === 0) return acc;
        if (key === 'rateLimit') {
          if (value.count && value.period) {
            acc[key] = value;
          }
          return acc;
        }
        if (key === 'timeRange') {
          if (value.start && value.end) {
            acc[key] = value;
          }
          return acc;
        }
        acc[key] = value;
      }
      return acc;
    }, {});

    onChange(Object.keys(cleaned).length > 0 ? cleaned : null);
    setOpen(false);
  };

  const updateCondition = (key, value) => {
    setLocalConditions(prev => ({ ...prev, [key]: value }));
  };

  const clearCondition = (key) => {
    setLocalConditions(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // 渲染条件输入控件
  const renderConditionInput = (conditionType) => {
    const { key, label, component, description, options, dataSource, placeholder, min, schema } = conditionType;
    const value = localConditions[key];

    // 布尔开关
    if (component === 'switch') {
      return (
        <ConditionField key={key} label={label} description={description} inline>
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => updateCondition(key, checked || undefined)}
          />
        </ConditionField>
      );
    }

    // 数字输入
    if (component === 'number') {
      return (
        <ConditionField
          key={key}
          label={label}
          description={description}
          hasValue={value !== undefined && value !== ''}
          onClear={() => clearCondition(key)}
        >
          <Input
            type="number"
            min={min ?? 0}
            placeholder={placeholder || '不限制'}
            value={value ?? ''}
            onChange={(e) => updateCondition(key, e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </ConditionField>
      );
    }

    // 多选下拉框
    if (component === 'multiSelect') {
      const selectOptions = dataSource && dynamicDataSources[dataSource]
        ? dynamicDataSources[dataSource]
        : options || [];

      return (
        <ConditionField
          key={key}
          label={label}
          description={description}
          hasValue={Array.isArray(value) && value.length > 0}
          onClear={() => clearCondition(key)}
        >
          <MultiSelect
            value={value || []}
            onChange={(val) => updateCondition(key, val.length > 0 ? val : undefined)}
            options={selectOptions}
            placeholder="选择..."
          />
        </ConditionField>
      );
    }

    // 频率限制
    if (component === 'rateLimit') {
      const rateLimit = value || { count: '', period: 'hour' };
      const periodOptions = schema?.period?.options || [
        { value: 'minute', label: '每分钟' },
        { value: 'hour', label: '每小时' },
        { value: 'day', label: '每天' },
      ];

      return (
        <ConditionField
          key={key}
          label={label}
          description={description}
          hasValue={rateLimit.count !== '' && rateLimit.count !== undefined}
          onClear={() => clearCondition(key)}
        >
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              placeholder="次数"
              value={rateLimit.count ?? ''}
              onChange={(e) => updateCondition(key, {
                ...rateLimit,
                count: e.target.value ? parseInt(e.target.value) : ''
              })}
              className="w-24"
            />
            <Select
              value={rateLimit.period || 'hour'}
              onValueChange={(val) => updateCondition(key, { ...rateLimit, period: val })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ConditionField>
      );
    }

    // 时间范围
    if (component === 'timeRange') {
      const timeRange = value || { start: '', end: '' };

      return (
        <ConditionField
          key={key}
          label={label}
          description={description}
          hasValue={!!(timeRange.start || timeRange.end)}
          onClear={() => clearCondition(key)}
        >
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              value={timeRange.start || ''}
              onChange={(e) => updateCondition(key, { ...timeRange, start: e.target.value })}
            />
            <span className="text-muted-foreground text-sm">至</span>
            <Input
              type="time"
              value={timeRange.end || ''}
              onChange={(e) => updateCondition(key, { ...timeRange, end: e.target.value })}
            />
          </div>
        </ConditionField>
      );
    }

    // 文本列表（逗号分隔）
    if (component === 'textList') {
      return (
        <ConditionField
          key={key}
          label={label}
          description={description}
          hasValue={Array.isArray(value) && value.length > 0}
          onClear={() => clearCondition(key)}
        >
          <Input
            placeholder={placeholder || '多个值用逗号分隔'}
            defaultValue={value?.join(', ') || ''}
            onBlur={(e) => {
              const val = e.target.value;
              if (!val) {
                clearCondition(key);
              } else {
                const items = val.split(',').map(s => s.trim()).filter(Boolean);
                updateCondition(key, items.length > 0 ? items : undefined);
              }
            }}
          />
        </ConditionField>
      );
    }

    return null;
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('w-7 h-7', hasConfig ? 'text-primary' : 'text-muted-foreground/30')}
          disabled={disabled}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <DrawerTitle>条件配置</DrawerTitle>
            <DrawerDescription>
              为 &quot;{permission.name}&quot; 设置生效条件
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {conditionTypes.map(renderConditionInput)}
          </div>
          <DrawerFooter>
            <Button onClick={handleSave}>确定</Button>
            <DrawerClose asChild>
              <Button variant="outline">取消</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
