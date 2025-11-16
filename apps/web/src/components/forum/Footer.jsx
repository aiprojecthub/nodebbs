'use client';

import Link from 'next/link';
import { Github, Twitter, Mail } from 'lucide-react';

export default function Footer({ settings }) {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { label: '服务条款', href: '/terms' },
    { label: '隐私政策', href: '/privacy' },
    { label: '帮助', href: '/help' },
    { label: '关于', href: '/about' },
  ];

  const socialLinks = [
    { icon: Github, href: 'https://github.com/aiprojecthub/nodebbs', label: 'GitHub' }
  ];

  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 左侧：版权和链接 */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>© {currentYear} {settings?.site_name?.value || 'NodeBBS'}</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {footerLinks.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* 右侧：社交链接 */}
          <div className="flex items-center space-x-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={social.label}
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
