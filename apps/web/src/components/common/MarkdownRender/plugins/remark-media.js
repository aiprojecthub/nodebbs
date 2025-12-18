import { visit } from 'unist-util-visit';

export default function remarkMedia() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type === 'textDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'containerDirective'
      ) {
        if (node.name !== 'video' && node.name !== 'audio') return;

        const data = node.data || (node.data = {});
        const attributes = node.attributes || {};
        
        // Ensure src exists
        if (!attributes.src && !attributes.url) return;

        data.hName = node.name; // 'video' or 'audio'
        data.hProperties = {
          src: attributes.src || attributes.url,
          controls: true,
          ...attributes,
        };
      }
    });
  };
}
