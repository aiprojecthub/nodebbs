import React from 'react';
import { Copy } from 'lucide-react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import remarkMedia from './plugins/remark-media';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { cn } from '@/lib/utils';
import CopyButton from '@/components/common/CopyButton';

function MarkdownRender({ content }) {
  return (
    <Markdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkDirective, remarkMedia]}
      components={{
        a: ({ node, ...props }) => (
          <Link {...props} target='_blank' rel='noopener noreferrer' />
        ),
        img: ({ node, src, alt, ...props }) => {
          if (!src || src.trim() === '') {
            return null;
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={src} 
              alt={alt || ''} 
              loading="lazy"
              {...props} 
            />
          );
        },
        audio: ({ node, src, ...props }) => {
          // 处理网易云音乐
          // 匹配: https://music.163.com/#/song?id=123456 或 https://music.163.com/song?id=123456
          const neteaseMatch = src.match(/music\.163\.com\/.*[?&]id=(\d+)/);
          if (neteaseMatch) {
            return (
              <div className="my-2" style={{ width: props.width || '100%' }}>
                <iframe
                  border="0"
                  width="100%"
                  height="86"
                  src={`//music.163.com/outchain/player?type=2&id=${neteaseMatch[1]}&auto=0&height=66`}
                  title="Netease Cloud Music"
                />
              </div>
            );
          }

          return (
            <audio
              controls
              className="w-full my-2"
              src={src}
              {...props}
            >
              您的浏览器不支持音频播放。
            </audio>
          );
        },
        video: ({ node, src, title, ...props }) => {
          const { width, height, ...rest } = props;
          
          // 获取样式对象的辅助函数
          const getWrapperStyle = () => {
            const style = { maxWidth: '100%' };
            if (width) style.width = width;
            if (height) style.height = height;
            return style;
          };

          // 处理 YouTube
          const youtubeMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
          if (youtubeMatch) {
             return (
               <div 
                 className="relative aspect-video my-4 rounded-lg overflow-hidden" 
                 style={getWrapperStyle()}
               >
                 <iframe
                   width="100%"
                   height="100%"
                   src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                   title={title || "YouTube video player"}
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                   allowFullScreen
                   className="absolute top-0 left-0"
                 ></iframe>
               </div>
             );
          }

          // 处理抖音视频
          // 匹配: https://www.douyin.com/video/7364265076712312127
          const douyinMatch = src.match(/douyin\.com\/video\/(\d+)/);
          if (douyinMatch) {
            return (
              <div 
                className="relative aspect-video my-4 rounded-lg overflow-hidden" 
                style={getWrapperStyle()}
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://open.douyin.com/player/video?vid=${douyinMatch[1]}&autoplay=0`}
                  title={title || "Douyin video player"}
                  allowFullScreen
                  className="absolute top-0 left-0"
                  referrerPolicy="unsafe-url"
                ></iframe>
              </div>
            );
          }

          // 处理 Bilibili
          const biliMatch = src.match(/bilibili\.com\/video\/(BV[0-9a-zA-Z]+)/);
          if (biliMatch) {
            return (
              <div 
                className="relative aspect-video my-4 rounded-lg overflow-hidden"
                style={getWrapperStyle()}
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://player.bilibili.com/player.html?bvid=${biliMatch[1]}&high_quality=1&danmaku=0`}
                  title={title || "Bilibili video player"}
                  allowFullScreen
                  className="absolute top-0 left-0"
                  sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups"
                ></iframe>
              </div>
            );
          }
          
          // 默认视频标签
          return (
             <video
               controls
               className="max-w-full rounded-lg my-2 h-auto"
               style={{ width: width || '100%' }}
               src={src}
               title={title}
               {...rest}
             >
               您的浏览器不支持视频播放。
             </video>
          );
        },
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
      }}
    >
      {content}
    </Markdown>
  );
}



function CodeBlock({ language, code, ...rest }) {
  return (
    <div className='relative group rounded-lg w-full max-w-full grid grid-cols-1 min-w-0'>
      <CopyButton
        value={code}
        variant='ghost'
        size='sm'
        className='absolute text-accent right-2 top-2 shrink opacity-0 group-hover:opacity-100 transition z-10'
      >
        {({ copied }) => (copied ? '已复制' : <Copy className='w-4 h-4' />)}
      </CopyButton>
      <SyntaxHighlighter
        {...rest}
        language={language}
        style={tomorrow}
        customStyle={{ margin: 0, overflowX: 'auto', maxWidth: '100%' }}
        PreTag='div'
        className='rounded-xl border-[3px] border-border overflow-x-auto max-w-full min-w-0'
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default React.memo(MarkdownRender);
