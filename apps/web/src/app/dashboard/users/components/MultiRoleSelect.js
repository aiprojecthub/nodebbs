'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function MultiRoleSelect({
  value = [],
  onChange,
  disabled,
  placeholder = '选择角色...',
  roles = []
}) {
  const [open, setOpen] = useState(false);

  const toggleRole = (roleId) => {
    const newValue = value.includes(roleId)
      ? value.filter(id => id !== roleId)
      : [...value, roleId];
    onChange(newValue);
  };

  const selectedLabels = value
    .map(id => roles.find(r => r.id === id)?.name)
    .filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索角色..." />
          <CommandList>
            <CommandEmpty>未找到角色</CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.name}
                  onSelect={() => toggleRole(role.id)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value.includes(role.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {role.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                    )}
                    <span>{role.name}</span>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-[10px] px-1 h-4">
                        系统
                      </Badge>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
