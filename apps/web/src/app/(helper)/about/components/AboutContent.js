'use client';

import React from 'react';
import CopyButton from '@/components/common/CopyButton';
import { Github, Rocket, Bot, Code2, Plug, Settings, Shield, Mail, Zap, QrCode, Copy, Check, Star, GitFork, ArrowRight, Terminal, Award, Gift, MessageCircle, Search, Users, Ticket, Coins, ShieldCheck } from 'lucide-react';

const GITHUB_REPO_URL = 'https://github.com/aiprojecthub/nodebbs';

const CodeBlock = ({ code, language = 'bash' }) => {
  return (
    <div className="relative group overflow-hidden min-w-0 rounded-xl shadow-lg">
      <div className="flex items-center justify-between bg-slate-800 dark:bg-slate-900 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Terminal className="h-3.5 w-3.5" />
            <span className="font-medium">{language}</span>
          </div>
        </div>
        <CopyButton
          value={code}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors h-auto w-auto shrink-0 border border-slate-600/50"
          title="复制代码"
        >
          {({ copied }) => (
            <>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-400" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>复制</span>
                </>
              )}
            </>
          )}
        </CopyButton>
      </div>
      <div className="bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm overflow-x-auto">
        <pre className="text-emerald-400 m-0 whitespace-pre-wrap break-all">
          <span className="text-slate-500 select-none">$ </span>{code}
        </pre>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, link, linkText }) => (
  <div className="group relative p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition duration-300">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
    <div className="relative">
      <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-5">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary transition-colors group"
        >
          {linkText}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>
      )}
    </div>
  </div>
);

const SmallFeatureCard = ({ icon: Icon, title, description }) => (
  <div className="group flex items-start gap-4 p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-accent/50 transition-colors duration-300">
    <div className="shrink-0 p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const SectionTitle = ({ children, subtitle }) => (
  <div className="text-center mb-14">
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{children}</h2>
    {subtitle && (
      <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
    )}
  </div>
);

const AboutContent = () => {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative text-center py-20 md:py-32 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Star className="h-4 w-4" />
              <span>开源免费 · 一键部署</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              关于 NodeBBS
            </h1>

            <p className="mt-6 text-xl md:text-2xl text-muted-foreground font-medium">
              开源、现代化、支持一键部署的论坛系统
            </p>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              一个为开发者、创造者和技术爱好者打造的，充满活力、开放、互助的家园
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                <Github className="h-5 w-5" />
                查看源码
              </a>
              <a
                href="https://nodebbs.com/reference"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-full font-medium hover:bg-accent transition-colors"
              >
                <Code2 className="h-5 w-5" />
                API 文档
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Open Source & Quick Deploy Section */}
      <div className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6">
                <Rocket className="h-4 w-4" />
                快速开始
              </div>

              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                开源 & 一键部署
              </h2>

              <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
                NodeBBS 是一个完全开源的现代论坛系统，代码托管在 GitHub 上，任何人都可以自由使用、修改和贡献。
              </p>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                我们提供极简的一键部署方案，让你可以快速搭建自己的论坛社区：
              </p>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">1</span>
                    克隆仓库（源码部署）
                  </div>
                  <CodeBlock code={`git clone ${GITHUB_REPO_URL}.git`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">2</span>
                    一键部署
                  </div>
                  <CodeBlock code="cd nodebbs && npx nodebbs" />
                </div>
              </div>

              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-8 text-primary font-medium transition-colors group"
              >
                <Github className="h-5 w-5" />
                访问 GitHub 仓库
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl blur-2xl" />
                <div className="relative p-12 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-border/50">
                  <Github className="h-32 w-32 md:h-40 md:w-40 text-foreground/80" />
                  <div className="flex items-center justify-center gap-6 mt-6">
                    <a
                      href={GITHUB_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-yellow-500 transition-colors"
                    >
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>Star</span>
                    </a>
                    <a
                      href={`${GITHUB_REPO_URL}/fork`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <GitFork className="h-4 w-4" />
                      <span>Fork</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Section */}
      <div className="py-20 md:py-28 px-4 bg-accent/30">
        <div className="max-w-6xl mx-auto">
          <SectionTitle subtitle="强大的技术栈和丰富的功能，助你快速构建现代化论坛">
            核心特性
          </SectionTitle>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Bot}
              title="AI 辅助开发"
              description="使用 AI 友好的 JavaScript 技术栈构建的全栈项目，是学习 AI 辅助全栈开发的绝佳实践案例。"
            />
            <FeatureCard
              icon={Code2}
              title="完整 API 接口"
              description="提供完整的 RESTful API 文档，方便开发者集成第三方应用或构建自定义客户端。"
              link="https://nodebbs.com/reference"
              linkText="查看 API 文档"
            />
            <FeatureCard
              icon={Settings}
              title="丰富功能特性"
              description="内置多种实用功能，包括注册模式、内容审核、二维码登录、OAuth 认证等，适合初学者学习。"
            />
          </div>
        </div>
      </div>

      {/* Built-in Features Section */}
      <div className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionTitle subtitle="开箱即用的企业级功能，无需额外配置">
            内置功能亮点
          </SectionTitle>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SmallFeatureCard
              icon={Shield}
              title="内容审核"
              description="支持发布前审核、举报处理、审核日志"
            />
            <SmallFeatureCard
              icon={QrCode}
              title="二维码登录"
              description="扫码即可登录，跨平台便捷体验"
            />
            <SmallFeatureCard
              icon={Plug}
              title="OAuth 认证"
              description="支持 GitHub、Google、微信等第三方登录"
            />
            <SmallFeatureCard
              icon={ShieldCheck}
              title="人机验证"
              description="集成 reCAPTCHA、hCaptcha、Turnstile"
            />
            <SmallFeatureCard
              icon={Coins}
              title="积分系统"
              description="完整的积分、余额、交易记录管理"
            />
            <SmallFeatureCard
              icon={Award}
              title="勋章成就"
              description="根据用户行为自动颁发勋章奖励"
            />
            <SmallFeatureCard
              icon={Gift}
              title="签到奖励"
              description="每日签到、连续签到额外奖励"
            />
            <SmallFeatureCard
              icon={MessageCircle}
              title="私信系统"
              description="用户间私聊、消息通知提醒"
            />
            <SmallFeatureCard
              icon={Ticket}
              title="邀请注册"
              description="邀请码机制，精准控制用户增长"
            />
          </div>
        </div>
      </div>

      {/* Join & Contribute Section */}
      <div className="relative py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Star className="h-4 w-4" />
            开源社区
          </div>

          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            加入我们
          </h2>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            无论您是想学习 AI 全栈开发、集成第三方应用，还是为开源社区贡献代码，NodeBBS 都欢迎您的参与。
          </p>

          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            立即 Star 我们的项目，提出您的建议，或者直接贡献代码，让我们一起构建更好的论坛系统！
          </p>

          <div className="flex flex-wrap gap-4 justify-center mt-10">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background rounded-full font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <Github className="h-5 w-5" />
              GitHub
            </a>
            <a
              href="https://nodebbs.com/reference"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-card border border-border rounded-full font-medium hover:bg-accent transition-colors shadow-lg"
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

export default AboutContent;
