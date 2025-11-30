
'use client';

import React, { useState } from 'react';
import { Github, Rocket, Bot, Code2, Plug, Settings, Shield, Mail, Zap, QrCode, UserCheck, Copy, Check } from 'lucide-react';

const CodeBlock = ({ code, language = 'bash' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-slate-800 dark:bg-slate-900 rounded-t-lg px-4 py-2 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-medium">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
          title={copied ? '已复制' : '复制代码'}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      <div className="bg-slate-900 dark:bg-slate-950 rounded-b-lg p-4 font-mono text-sm overflow-x-auto border border-slate-700 border-t-0">
        <pre className="text-slate-100 m-0">{code}</pre>
      </div>
    </div>
  );
};

const AboutPage = () => {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <div className="text-center py-16 md:py-24 px-4 bg-card text-card-foreground shadow-sm">
        <div className="max-w-4xl mx-auto">
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">关于 NodeBBS</h1>
          <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
            开源、现代化、支持一键部署的论坛系统
          </p>
          <p className="mt-4 text-md max-w-3xl mx-auto text-muted-foreground">
            一个为开发者、创造者和技术爱好者打造的，充满活力、开放、互助的家园
          </p>
        </div>
      </div>

      {/* Open Source & Quick Deploy Section */}
      <div className="py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-3xl font-bold tracking-tight mb-4 flex items-center gap-2">
              <Rocket className="h-8 w-8 text-primary" />
              开源 & 一键部署
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              NodeBBS 是一个完全开源的现代论坛系统，代码托管在 GitHub 上，任何人都可以自由使用、修改和贡献。
            </p>
            <p className="text-lg text-muted-foreground mb-6">
              我们提供极简的一键部署方案，让你可以在几分钟内快速搭建自己的论坛社区：
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2 font-medium">步骤 1：克隆仓库</div>
                <CodeBlock code="git clone https://github.com/aiprojecthub/nodebbs.git" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2 font-medium">步骤 2：一键部署</div>
                <CodeBlock code="cd nodebbs && ./deploy.sh" />
              </div>
            </div>
            <a
              href="https://github.com/aiprojecthub/nodebbs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 text-primary hover:underline"
            >
              <Github className="h-5 w-5" />
              访问 GitHub 仓库
            </a>
          </div>
          <div className="order-1 md:order-2 text-center">
            <Github className="mx-auto h-48 w-48 text-muted" />
          </div>
        </div>
      </div>

      {/* Core Features Section */}
      <div className="bg-card text-card-foreground py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">核心特性</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="p-6 text-center">
              <Bot className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">AI 辅助开发</h3>
              <p className="mt-2 text-muted-foreground">
                使用 AI 友好的 JavaScript 技术栈构建的全栈项目，是学习 AI 辅助全栈开发的绝佳实践案例。
              </p>
            </div>
            <div className="p-6 text-center">
              <Code2 className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">完整 API 接口</h3>
              <p className="mt-2 text-muted-foreground">
                提供完整的 RESTful API 文档，方便开发者集成第三方应用或构建自定义客户端。
              </p>
              <a
                href="https://nodebbs.com/reference"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-primary hover:underline"
              >
                查看 API 文档
              </a>
            </div>
            <div className="p-6 text-center">
              <Settings className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-4 text-xl font-semibold">丰富功能特性</h3>
              <p className="mt-2 text-muted-foreground">
                内置多种实用功能，包括注册模式、内容审核、二维码登录、OAuth 认证等，适合初学者学习。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Built-in Features Section */}
      <div className="py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">内置功能亮点</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">内容审核</h4>
                <p className="text-sm text-muted-foreground">智能内容审核，保障社区质量</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <QrCode className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">二维码登录</h4>
                <p className="text-sm text-muted-foreground">扫码即可登录，方便快捷</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">垃圾注册拦截</h4>
                <p className="text-sm text-muted-foreground">有效防止垃圾注册和恶意账号</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <Plug className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">OAuth 认证</h4>
                <p className="text-sm text-muted-foreground">支持第三方 OAuth 登录集成</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <Mail className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">邮件服务</h4>
                <p className="text-sm text-muted-foreground">内置邮件通知和验证功能</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card">
              <Zap className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">API 限速</h4>
                <p className="text-sm text-muted-foreground">智能限流保护，防止滥用</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Join & Contribute Section */}
      <div className="py-16 md:py-24 px-4 bg-card text-card-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold">加入我们</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            无论您是想学习 AI 全栈开发、集成第三方应用，还是为开源社区贡献代码，NodeBBS 都欢迎您的参与。
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            立即 Star 我们的项目，提出您的建议，或者直接贡献代码，让我们一起构建更好的论坛系统！
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <a
              href="https://github.com/aiprojecthub/nodebbs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
            <a
              href="https://nodebbs.com/reference"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              <Code2 className="h-5 w-5" />
              API 文档
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
