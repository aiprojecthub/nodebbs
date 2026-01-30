import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { TableSelector } from './TableSelector';

export const TableTool = ({ editor, disabled }) => {
  const handleInsertTable = (rows, cols) => {
    let markdown = '\n';
    // 表头
    markdown += '| ' + Array(cols).fill('标题').join(' | ') + ' |\n';
    // 分隔线
    markdown += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
    // 数据行
    for (let r = 0; r < rows; r++) {
       markdown += '| ' + Array(cols).fill('内容').join(' | ') + ' |\n';
    }
    markdown += '\n';
    editor.insertText(markdown);
  };

  return (
    <TableSelector
      title="表格"
      Icon={TableIcon}
      disabled={disabled}
      onConfirm={handleInsertTable}
    />
  );
};
