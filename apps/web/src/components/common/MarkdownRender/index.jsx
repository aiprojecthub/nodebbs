import React from 'react';
import Link from '@/components/common/Link';

import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMedia from './plugins/remark-media';
import remarkSticker from './plugins/remark-sticker';
import remarkPoll from './plugins/remark-poll';
import remarkLottery from './plugins/remark-lottery';
import remarkAttachment from './plugins/remark-attachment';
import remarkProtected from './plugins/remark-protected';
import remarkRestoreDirectives from './plugins/remark-restore-directives';
import CodeBlock from './CodeBlock';
import PollWidget from './components/PollWidget';
import LotteryWidget from './components/LotteryWidget';
import AttachmentWidget from './components/AttachmentWidget';
import AudioPlayer from './components/AudioPlayer';
import VideoPlayer from './components/VideoPlayer';
import ContentImage from './components/ContentImage';
import { Emoji } from '@/components/common/Emoji';
import ProtectedContentBlock from './components/ProtectedContentBlock';
import ProtectedHiddenBlock from './components/ProtectedHiddenBlock';
import { ImagePreviewProvider } from '@/components/common/ImagePreview/ImagePreviewContext';
import remarkEmoji from './plugins/remark-emoji';

import { cn } from '@/lib/utils';

// 允许的额外协议
const ALLOWED_PROTOCOLS = ['magnet:', 'thunder:', 'ed2k:'];

// 自定义 URL 转换函数，允许更多协议
function customUrlTransform(url) {
  if (ALLOWED_PROTOCOLS.some(protocol => url.startsWith(protocol))) {
    return url;
  }
  return defaultUrlTransform(url);
}

// 插件列表（模块级常量，避免每次渲染重建导致 react-markdown 重新初始化插件管线）
const REMARK_PLUGINS = [
  [remarkGfm, { singleTilde: false }],
  remarkDirective,
  remarkMedia,
  remarkSticker,
  remarkPoll,
  remarkLottery,
  remarkAttachment,
  remarkEmoji,
  remarkProtected,
  remarkRestoreDirectives,
];

// 自定义组件映射（模块级常量，所有组件函数均为纯函数，不捕获外部变量）
const COMPONENTS = {
  a: ({ node, ...props }) => (
    <Link {...props} target='_blank' rel='noopener noreferrer' />
  ),
  img: ({ node, src, alt, ...props }) => (
    <ContentImage src={src} alt={alt} {...props} />
  ),
  audio: ({ node, src, ...props }) => (
    <AudioPlayer src={src} {...props} />
  ),
  video: ({ node, src, title, ...props }) => (
    <VideoPlayer src={src} title={title} {...props} />
  ),
  code({ children, className, node, ...rest }) {
    // 仅处理行内代码，代码块由 pre 标签处理
    return (
      <code
        {...rest}
        className={cn("not-prose bg-muted px-1.5 py-0.5 rounded-sm font-bold", className)}
      >
        {children}
      </code>
    );
  },
  pre({ node, ...props }) {
    const codeNode = node.children && node.children[0];

    if (codeNode && codeNode.tagName === 'code') {
      const className = codeNode.properties?.className || [];
      const match = /language-(\w+)/.exec((Array.isArray(className) ? className.join(' ') : className) || '');
      const language = match ? match[1] : 'text';
      const code = codeNode.children[0]?.value || '';

      return (
        <div className="not-prose w-full">
          <CodeBlock language={language} code={code} />
        </div>
      );
    }

    return <pre {...props} />;
  },
  // 投票组件
  poll({ node, ...props }) {
    const pollId = props['data-poll-id'];
    return <PollWidget pollId={pollId} />;
  },
  // 抽奖组件
  lottery({ node, ...props }) {
    const lotteryId = props['data-lottery-id'];
    return <LotteryWidget lotteryId={lotteryId} />;
  },
  // 附件组件
  attachment({ node, ...props }) {
    const attachmentId = props['data-attachment-id'];
    return <AttachmentWidget attachmentId={attachmentId} />;
  },
  // 表情组件
  emoji({ node, ...props }) {
    return <Emoji code={props.code} size={props.size} className={props.className} />;
  },
  // 受保护内容组件
  'protected-content': ({ node, children, ...props }) => (
    <ProtectedContentBlock type={props['data-type']}>{children}</ProtectedContentBlock>
  ),
  'protected-hidden': ({ node, ...props }) => (
    <ProtectedHiddenBlock type={props['data-type']} />
  ),
};

function MarkdownRender({ content }) {
  return (
    <MarkdownErrorBoundary fallbackContent={content}>
      <ImagePreviewProvider>
        <Markdown
          urlTransform={customUrlTransform}
          remarkPlugins={REMARK_PLUGINS}
          components={COMPONENTS}
        >
          {content}
        </Markdown>
      </ImagePreviewProvider>
    </MarkdownErrorBoundary>
  );
}

export default React.memo(MarkdownRender);

// 错误边界组件，处理 Markdown 解析失败的情况
class MarkdownErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MarkdownRender error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 回退：显示原始内容
      return (
        <div className="whitespace-pre-wrap break-words">
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}
