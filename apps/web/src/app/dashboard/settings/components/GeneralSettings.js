'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

      {/* 站点统计脚本 */}
      {settings.site_analytics_scripts && (
        <div className='border border-border rounded-lg bg-card'>
          <div className='px-4 py-4 space-y-3'>
            <div className='space-y-1'>
              <Label
                htmlFor='site_analytics_scripts'
                className='text-sm font-semibold'
              >
                站点统计脚本
              </Label>
              <p className='text-sm text-muted-foreground'>
                {settings.site_analytics_scripts.description || '支持 Google Analytics、百度统计等脚本，不包含 <script> 标签的纯代码请自行包裹'}
              </p>
            </div>
            <Textarea
              id='site_analytics_scripts'
              defaultValue={settings.site_analytics_scripts.value}
              onBlur={(e) =>
                handleStringChange('site_analytics_scripts', e.target.value)
              }
              disabled={saving}
              className='max-w-md min-h-[100px] font-mono text-xs'
              placeholder='<script>...</script>'
            />
          </div>
        </div>
      )}

      {/* 页脚自定义 HTML */}
      {settings.site_footer_html && (
        <div className='border border-border rounded-lg bg-card'>
          <div className='px-4 py-4 space-y-3'>
            <div className='space-y-1'>
              <Label
                htmlFor='site_footer_html'
                className='text-sm font-semibold'
              >
                页脚自定义 HTML
              </Label>
              <p className='text-sm text-muted-foreground'>
                {settings.site_footer_html.description || '支持 HTML 标签，将显示在页脚区域'}
              </p>
            </div>
            <Textarea
              id='site_footer_html'
              defaultValue={settings.site_footer_html.value}
              onBlur={(e) =>
                handleStringChange('site_footer_html', e.target.value)
              }
              disabled={saving}
              className='max-w-md min-h-[100px] font-mono text-xs'
              placeholder='<span>...</span>'
            />
          </div>
        </div>
      )}

    </div>
  );
}
