import { visit } from 'unist-util-visit';

/**
 * 附件插件
 *
 * 支持语法:
 * ::attachment{id="1234"}
 *
 * 附件数据（文件名、大小、下载策略、当前用户是否可下载）由服务端根据 ID 返回，
 * Markdown 中只存引用；真实存储地址永不出现在正文里。
 */

export default function remarkAttachment() {
  return (tree) => {
    visit(tree, (node) => {
      // 附件使用 leafDirective（块级自闭合）
      if (node.type === 'leafDirective' && node.name === 'attachment') {
        const attributes = node.attributes || {};

        // id 是必填项
        if (!attributes.id) {
          console.warn('Attachment directive missing required "id" attribute');
          return;
        }

        // 设置 HAST 属性
        node.data = node.data || {};
        node.data.hName = 'attachment';
        node.data.hProperties = {
          'data-attachment-id': attributes.id,
        };
      }
    });
  };
}
