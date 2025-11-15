'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GeneralSettings({
  settings,
  handleStringChange,
  handleNumberChange,
  saving,
}) {
  return (
    <div className='space-y-4'>
      {/* 站点名称 */}
      {settings.site_name && (
        <div className='border border-border rounded-lg bg-card'>
          <div className='px-4 py-4 space-y-3'>
            <div className='space-y-1'>
              <Label htmlFor='site_name' className='text-sm font-semibold'>
                站点名称
              </Label>
              <p className='text-sm text-muted-foreground'>
                {settings.site_name.description}
              </p>
            </div>
            <Input
              id='site_name'
              defaultValue={settings.site_name.value}
              onBlur={(e) => handleStringChange('site_name', e.target.value)}
              disabled={saving}
              className='max-w-md'
            />
          </div>
        </div>
      )}

      {/* 站点描述 */}
      {settings.site_description && (
        <div className='border border-border rounded-lg bg-card'>
          <div className='px-4 py-4 space-y-3'>
            <div className='space-y-1'>
              <Label
                htmlFor='site_description'
                className='text-sm font-semibold'
              >
                站点描述
              </Label>
              <p className='text-sm text-muted-foreground'>
                {settings.site_description.description}
              </p>
            </div>
            <Input
              id='site_description'
              defaultValue={settings.site_description.value}
              onBlur={(e) =>
                handleStringChange('site_description', e.target.value)
              }
              disabled={saving}
              className='max-w-md'
            />
          </div>
        </div>
      )}

    </div>
  );
}
