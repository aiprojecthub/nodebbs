import { visit } from 'unist-util-visit';

// 允许的 directive 名称白名单
// ⚠️ 新增 directive 时必须同步加入，否则会被当成误识别的链接还原成纯文本
const ALLOWED_DIRECTIVES = ['video', 'audio', 'sticker', 'poll', 'lottery', 'attachment', 'emoji', 'protected', 'protected-hidden'];

/**
 * 这个插件用于还原非预期的 directive 节点为原始文本
 * 解决 remarkDirective 插件将磁力链接等特殊链接错误解析为 directive 的问题
 * 
 * 例如: magnet:?xt=urn:btih:F5615DFB... 中的 :btih 会被错误识别为 directive
 * 此插件会将非白名单中的 directive 还原为普通文本
 */
export default function remarkRestoreDirectives() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        // 如果不是白名单中的 directive，将其还原为文本
        if (!ALLOWED_DIRECTIVES.includes(node.name)) {
          // 重建原始文本
          const originalText = reconstructDirectiveText(node);
          
          // 替换为文本节点
          parent.children.splice(index, 1, {
            type: 'text',
            value: originalText
          });
          
          // 返回 index 以便重新访问当前位置
          return index;
        }
      }
    });
  };
}

/**
 * 重建 directive 节点的原始文本
 * @param {Object} node - directive 节点
 * @returns {string} 原始文本
 */
function reconstructDirectiveText(node) {
  // 根据节点类型确定正确的前缀
  let prefix = ':';
  if (node.type === 'leafDirective') prefix = '::';
  if (node.type === 'containerDirective') prefix = ':::';
  
  let text = prefix + node.name;
  
  // 还原属性（如果有）
  const attributes = node.attributes || {};
  const attrKeys = Object.keys(attributes);
  if (attrKeys.length > 0) {
    const attrStr = attrKeys
      .map(key => `${key}="${attributes[key]}"`)
      .join(' ');
    text += `{${attrStr}}`;
  }
  
  // 处理子节点内容
  if (node.children && node.children.length > 0) {
    const childText = node.children
      .map(child => {
        if (child.type === 'text') {
          return child.value || '';
        }
        // 递归处理嵌套的 directive
        if (
          child.type === 'textDirective' ||
          child.type === 'leafDirective' ||
          child.type === 'containerDirective'
        ) {
          return reconstructDirectiveText(child);
        }
        return '';
      })
      .join('');
    
    // textDirective 子节点用 [] 包裹
    if (node.type === 'textDirective' && childText) {
      text += `[${childText}]`;
    } else {
      text += childText;
    }
  }
  
  return text;
}
