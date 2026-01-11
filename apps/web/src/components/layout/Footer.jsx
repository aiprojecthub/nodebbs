'use client';


import Link from '@/components/common/Link';
import { useSettings } from '@/contexts/SettingsContext';
import { Github } from 'lucide-react';

export default function Footer({ version }) {
  const { settings } = useSettings();
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: 'API 文档', href: '/reference' },
    { label: '关于', href: '/about' },
  ];

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          {/* 左侧：自定义内容 或 默认版权信息 */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
            <span>© {currentYear} {settings?.site_name?.value || 'NodeBBS'}</span>
            {settings?.site_footer_html?.value ? (
              <div 
                className="flex flex-wrap items-center gap-x-3 gap-y-1 [&_a]:hover:text-foreground [&_a]:transition-colors"
                dangerouslySetInnerHTML={{ __html: settings.site_footer_html.value }} 
              />
            ) : (
              <>
                {footerLinks.map((link) => (
                  <span key={link.href} className="flex items-center gap-3">
                    <span>•</span>
                    <Link
                      href={link.href}
                     
                      className="hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </div>

          {/* 右侧：程序声明 */}
          <div className="flex items-center gap-6">
            {version && (
              <a
                href="https://github.com/aiprojecthub/nodebbs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                Built with NodeBBS v{version}
                <Github className='w-4 h-4'/>
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
