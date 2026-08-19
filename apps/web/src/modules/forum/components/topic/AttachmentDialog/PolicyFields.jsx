'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultiSelect from '@/components/common/MultiSelect';
import { ATTACHMENT_POLICIES } from '@/utils/attachment';

/**
 * 下载策略选择器 + 各策略的附加字段。
 * 由 UploadTab 在「新建」与「编辑草稿」两种场景复用。
 *
 * @param {object} props
 * @param {{policy:string, pointsCost:number, allowedRoleIds:number[]}} props.value
 * @param {(next:object)=>void} props.onChange - 传入完整的下一个 value
 * @param {boolean} [props.disabled]
 */
export default function PolicyFields({ value, onChange, disabled }) {
  const [roleOptions, setRoleOptions] = useState([]);
  const [rolesError, setRolesError] = useState(null);

  const activePolicy = ATTACHMENT_POLICIES.find((p) => p.value === value.policy);

  // 仅在真正选到「限定角色」时才拉角色列表，避免每次开弹窗都打一次接口
  useEffect(() => {
    if (value.policy !== 'role' || roleOptions.length > 0) return;
    let cancelled = false;
    fetch('/api/roles/options')
      .then(async (res) => {
        if (!res.ok) throw new Error('加载角色列表失败');
        return res.json();
      })
      .then((list) => {
        if (cancelled) return;
        setRoleOptions(list.map((r) => ({ value: r.id, label: r.name })));
      })
      .catch((err) => !cancelled && setRolesError(err.message));
    return () => {
      cancelled = true;
    };
  }, [value.policy, roleOptions.length]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-sm">下载权限</Label>
        <Select
          value={value.policy}
          onValueChange={(policy) => onChange({ ...value, policy })}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTACHMENT_POLICIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activePolicy && (
          <p className="text-xs text-muted-foreground">{activePolicy.description}</p>
        )}
      </div>

      {value.policy === 'points' && (
        <div className="space-y-1.5">
          <Label className="text-sm">积分价格</Label>
          <Input
            type="number"
            min="1"
            value={value.pointsCost || ''}
            onChange={(e) =>
              onChange({
                ...value,
                pointsCost: e.target.value ? parseInt(e.target.value, 10) : 0,
              })
            }
            placeholder="下载所需积分"
            disabled={disabled}
          />
        </div>
      )}

      {value.policy === 'role' && (
        <div className="space-y-1.5">
          <Label className="text-sm">允许下载的角色</Label>
          <MultiSelect
            value={value.allowedRoleIds || []}
            onChange={(allowedRoleIds) => onChange({ ...value, allowedRoleIds })}
            options={roleOptions}
            placeholder="选择角色..."
            disabled={disabled}
          />
          {rolesError && <p className="text-xs text-destructive">{rolesError}</p>}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        话题作者与管理员不受下载权限限制。
      </p>
    </div>
  );
}
