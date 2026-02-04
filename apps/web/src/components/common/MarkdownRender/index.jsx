import React from 'react';
import Link from '@/components/common/Link';

import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMedia from './plugins/remark-media';
import remarkSticker from './plugins/remark-sticker';
import remarkPoll from './plugins/remark-poll';
import remarkRestoreDirectives from './plugins/remark-restore-directives';
import CodeBlock from './CodeBlock';
import PollWidget from './components/PollWidget';
import AudioPlayer from './components/AudioPlayer';
import VideoPlayer from './components/VideoPlayer';
import ContentImage from './components/ContentImage';
import { ImagePreviewProvider } from '@/components/common/ImagePreview/ImagePreviewContext';

import { cn } from '@/lib/utils';

// 允许的额外协议
const ALLOWED_PROTOCOLS = ['magnet:', 'thunder:', 'ed2k:'];

// 自定义 URL 转换函数，允许更多协议
function customUrlTransform(url) {
  // 检查是否是允许的额外协议
  if (ALLOWED_PROTOCOLS.some(protocol => url.startsWith(protocol))) {
    return url;
  }
  // 其他情况使用默认转换
  return defaultUrlTransform(url);
}

function MarkdownRender({ content }) {
  return (
    <MarkdownErrorBoundary fallbackContent={content}>
      <ImagePreviewProvider>
        <Markdown
          urlTransform={customUrlTransform}
          remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkDirective, remarkMedia, remarkSticker, remarkPoll, remarkRestoreDirectives]}
          components={{
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
          code(props) {
            const { children, className, node, ...rest } = props;
            // 仅处理行内代码，因为代码块由 pre 标签处理
            return (
              <code
                {...rest}
                className={cn("not-prose bg-muted px-1.5 py-0.5 rounded-sm font-bold", className)}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => {
            const codeNode = node.children && node.children[0];

            if (codeNode && codeNode.tagName === 'code') {
               const className = codeNode.properties?.className || [];
               const match = /language-(\w+)/.exec((Array.isArray(className) ? className.join(' ') : className) || '');
               const language = match ? match[1] : 'text'; // 如果没有语言则默认为 text

               // 从代码节点中提取文本内容
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
          'poll': ({ node, ...props }) => {
            const pollId = props['data-poll-id'];
            return <PollWidget pollId={pollId} />;
          },
        }}
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
      // Fallback: 显示原始内容
      return (
        <div className="whitespace-pre-wrap break-words">
          {this.props.fallbackContent}
        </div>
      );
    }
    return this.props.children;
  }
}
