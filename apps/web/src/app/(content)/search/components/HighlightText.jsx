/**
 * 搜索关键词高亮组件
 * 将文本中匹配搜索关键词的部分用 <mark> 标签包裹高亮显示
 */
export function HighlightText({ text, keyword }) {
  if (!text || !keyword) return text || null;

  // 转义正则特殊字符
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  const lowerKeyword = keyword.toLowerCase();

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lowerKeyword ? (
          <mark
            key={i}
            className='bg-primary/20 text-inherit rounded-sm px-0.5'
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
