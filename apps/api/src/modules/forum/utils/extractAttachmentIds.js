/**
 * 从 markdown 文本中提取所有 `::attachment{id="..."}` 指令引用的 ID。
 *
 * 指令语法（remark leafDirective）：行级 `::attachment{id="xxxxx"}`，可带其他属性。
 * 与 extractPollIds.js 同构。
 *
 * @param {string} content - markdown 原文
 * @returns {string[]} 去重后的 id 字符串数组（按出现顺序）
 */
export function extractAttachmentIds(content) {
  if (!content || typeof content !== 'string') return [];

  const re = /::attachment\{[^}]*\bid="([^"]+)"[^}]*\}/g;
  const ids = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(content)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * 从 markdown 文本中删除指定 id 列表对应的 `::attachment{id="..."}` 指令行。
 * 整行（含可能的前后空白与尾部换行）一并去掉，避免遗留空行污染排版。
 *
 * @param {string} content - markdown 原文
 * @param {string[]} idsToRemove - 要删除的附件 id 数组
 * @returns {string} 清洗后的 markdown
 */
export function stripAttachmentDirectives(content, idsToRemove) {
  if (!content || !idsToRemove || idsToRemove.length === 0) return content;

  const idSet = new Set(idsToRemove.map(String));
  const lineRe = /^[ \t]*::attachment\{[^}]*\}[ \t]*$\n?/gm;

  return content.replace(lineRe, (line) => {
    const idMatch = /\bid="([^"]+)"/.exec(line);
    if (idMatch && idSet.has(idMatch[1])) {
      return '';
    }
    return line;
  });
}
